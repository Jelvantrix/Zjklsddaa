import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

/**
 * Scheduled Cloud Function: Runs daily at 00:05 Helsinki time (EET)
 * Aggregates raw anonymous behavior tracking events from /events into /dailyStats/{YYYY-MM-DD}
 */
export const aggregateDailyStats = functions
  .region('europe-north1') // Close to Helsinki / Finland
  .pubsub.schedule('5 0 * * *')
  .timeZone('Europe/Helsinki')
  .onRun(async (context) => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const startOfDay = new Date(`${dateStr}T00:00:00.000Z`).getTime();
    const endOfDay = new Date(`${dateStr}T23:59:59.999Z`).getTime();

    console.log(`[Aggregation] Aggregating events for date: ${dateStr}`);

    try {
      const eventsSnap = await db
        .collection('events')
        .where('timestamp', '>=', startOfDay)
        .where('timestamp', '<=', endOfDay)
        .get();

      let pageViews = 0;
      let addToBags = 0;
      let purchases = 0;
      const uniqueSessions = new Set<string>();

      eventsSnap.forEach((doc) => {
        const ev = doc.data();
        if (ev.sessionId) uniqueSessions.add(ev.sessionId);
        if (ev.type === 'page_view') pageViews++;
        if (ev.type === 'add_to_bag') addToBags++;
        if (ev.type === 'purchase') purchases++;
      });

      // Calculate orders and revenue for yesterday
      const ordersSnap = await db
        .collection('orders')
        .where('createdAt', '>=', new Date(startOfDay).toISOString())
        .where('createdAt', '<=', new Date(endOfDay).toISOString())
        .get();

      let revenue = 0;
      let pieces = 0;
      let ordersCount = ordersSnap.size;

      ordersSnap.forEach((doc) => {
        const ord = doc.data();
        revenue += ord.totals?.total || 0;
        pieces += (ord.items || []).reduce((acc: number, it: any) => acc + (it.quantity || 1), 0);
      });

      const conversion = uniqueSessions.size > 0 ? (ordersCount / uniqueSessions.size) * 100 : 0;
      const aov = ordersCount > 0 ? revenue / ordersCount : 0;

      const dailyStatDoc = {
        id: `stat-${dateStr}`,
        date: dateStr,
        visitors: uniqueSessions.size,
        pageViews,
        orders: ordersCount,
        pieces,
        revenue,
        aov: +aov.toFixed(2),
        conversion: +conversion.toFixed(2),
        addToBags,
        calculatedAt: new Date().toISOString(),
        source: 'cloud_function_scheduled',
      };

      await db.collection('dailyStats').doc(`stat-${dateStr}`).set(dailyStatDoc, { merge: true });
      console.log(`[Aggregation] Successfully saved dailyStats for ${dateStr}`);
      return null;
    } catch (err) {
      console.error('[Aggregation] Error aggregating daily stats:', err);
      throw err;
    }
  });

/**
 * 13-month data retention cleanup: Runs once a month to prune events older than 400 days
 */
export const pruneOldEvents = functions
  .region('europe-north1')
  .pubsub.schedule('0 3 1 * *')
  .timeZone('Europe/Helsinki')
  .onRun(async () => {
    const cutoff = Date.now() - 400 * 24 * 60 * 60 * 1000;
    const oldEventsSnap = await db.collection('events').where('timestamp', '<', cutoff).limit(500).get();

    const batch = db.batch();
    oldEventsSnap.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`[Retention] Pruned ${oldEventsSnap.size} events older than 400 days.`);
    return null;
  });
