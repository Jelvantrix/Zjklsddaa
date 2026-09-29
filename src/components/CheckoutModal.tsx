import React, { useState } from 'react';
import { CartItem, Language } from '../types';
import { translations, formatPrice } from '../data/mockData';
import { BrandLogo } from './BrandLogo';
import { PaymentIcons } from './PaymentIcons';
import { X, Check, ArrowRight, ShieldCheck } from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  onOrderSuccess: () => void;
  language: Language;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  items,
  onOrderSuccess,
  language,
}) => {
  const t = translations[language].checkout;

  // Steps: 1 = Toimitus, 2 = Maksu, 3 = Vahvistus
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [email, setEmail] = useState('asiakas@esimerkki.fi');
  const [firstName, setFirstName] = useState('Eero');
  const [lastName, setLastName] = useState('Aarnio');
  const [street, setStreet] = useState('Mannerheimintie 14 B');
  const [postalCode, setPostalCode] = useState('00100');
  const [city, setCity] = useState('Helsinki');
  const [phone, setPhone] = useState('+358 40 123 4567');

  const [shippingMethod, setShippingMethod] = useState<'posti' | 'matkahuolto' | 'home'>('posti');
  const [paymentMethod, setPaymentMethod] = useState<'verkkopankki' | 'mobilepay' | 'klarna' | 'card' | 'applepay'>('verkkopankki');
  const [selectedBank, setSelectedBank] = useState('OP');

  const subtotal = items.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  const shippingCost = shippingMethod === 'home' ? 7.9 : (subtotal >= 100 ? 0 : 4.9);
  const total = subtotal + shippingCost;
  const orderNumber = '#ZE-84291';

  if (!isOpen) return null;

  const handleProceedToPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setStep(2);
  };

  const handleConfirmOrder = () => {
    setStep(3);
    onOrderSuccess();
  };

  return (
    <div className="fixed inset-0 z-[95] bg-white flex flex-col overflow-y-auto animate-fadeIn select-none">
      {/* Checkout Minimal Top Header */}
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-4 sm:py-6 border-b border-black/10 flex items-center justify-between">
        <BrandLogo size="sm" />
        <div className="flex items-center gap-2 sm:gap-4 md:gap-6 text-[11px] sm:text-xs font-mono">
          <span className={step === 1 ? 'font-medium underline underline-offset-4' : 'opacity-40'}>
            {t.step1}
          </span>
          <span>·</span>
          <span className={step === 2 ? 'font-medium underline underline-offset-4' : 'opacity-40'}>
            {t.step2}
          </span>
          <span>·</span>
          <span className={step === 3 ? 'font-medium underline underline-offset-4' : 'opacity-40'}>
            {t.step3}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-black/50 hover:text-black transition-colors cursor-pointer"
          aria-label="Sulje kassa"
        >
          <X className="w-5 h-5 stroke-[1.5]" />
        </button>
      </div>

      {/* Main Form Body */}
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex-1 grid grid-cols-1 md:grid-cols-12 gap-8 sm:gap-12">
        {/* LEFT COLUMN: STEPS */}
        <div className="md:col-span-7">
          {/* STEP 1: TOIMITUS (DELIVERY) */}
          {step === 1 && (
            <form onSubmit={handleProceedToPayment} className="space-y-6 sm:space-y-8 animate-fadeIn">
              <div>
                <h3 className="font-editorial text-2xl sm:text-3xl font-normal mb-1">
                  {t.customerInfo}
                </h3>
                <p className="text-xs font-sans text-black/60">
                  {language === 'fi' ? 'Syötä yhteystietosi lähetystä ja noutoilmoitusta varten.' : 'Provide your contact details for parcel delivery updates.'}
                </p>
              </div>

              <div className="space-y-3.5 sm:space-y-4">
                <div>
                  <label className="block text-[10.5px] sm:text-[11px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    {t.email}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-[10.5px] sm:text-[11px] font-mono uppercase tracking-wider text-black/60 mb-1">
                      {t.firstName}
                    </label>
                    <input
                      type="text"
                      required
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] sm:text-[11px] font-mono uppercase tracking-wider text-black/60 mb-1">
                      {t.lastName}
                    </label>
                    <input
                      type="text"
                      required
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] sm:text-[11px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    {t.street}
                  </label>
                  <input
                    type="text"
                    required
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-[10.5px] sm:text-[11px] font-mono uppercase tracking-wider text-black/60 mb-1">
                      {t.postalCode}
                    </label>
                    <input
                      type="text"
                      required
                      value={postalCode}
                      onChange={(e) => setPostalCode(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] sm:text-[11px] font-mono uppercase tracking-wider text-black/60 mb-1">
                      {t.city}
                    </label>
                    <input
                      type="text"
                      required
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10.5px] sm:text-[11px] font-mono uppercase tracking-wider text-black/60 mb-1">
                    {t.phone}
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-mono border border-black/20 focus:border-black focus:outline-none"
                  />
                </div>
              </div>

              {/* Shipping Method Radio options */}
              <div className="pt-4 sm:pt-6 border-t border-black/10">
                <h4 className="font-editorial text-2xl font-normal mb-3 sm:mb-4">
                  {t.shippingMethods}
                </h4>
                <div className="space-y-2.5 sm:space-y-3">
                  <label className={`flex items-start justify-between p-3 sm:p-3.5 border cursor-pointer transition-colors ${shippingMethod === 'posti' ? 'border-black bg-black/5' : 'border-black/20 hover:border-black/40'}`}>
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        checked={shippingMethod === 'posti'}
                        onChange={() => setShippingMethod('posti')}
                        className="accent-black mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className="font-sans text-xs font-medium block">
                          Posti Noutopiste (1–2 arkipäivää)
                        </span>
                        <span className="text-[10.5px] sm:text-[11px] text-black/60 font-mono">
                          Lähin noutopiste osoitteellesi
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs">{subtotal >= 100 ? '0,00 €' : '4,90 €'}</span>
                  </label>

                  <label className={`flex items-start justify-between p-3 sm:p-3.5 border cursor-pointer transition-colors ${shippingMethod === 'matkahuolto' ? 'border-black bg-black/5' : 'border-black/20 hover:border-black/40'}`}>
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        checked={shippingMethod === 'matkahuolto'}
                        onChange={() => setShippingMethod('matkahuolto')}
                        className="accent-black mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className="font-sans text-xs font-medium block">
                          Matkahuolto Lähellä-paketti
                        </span>
                        <span className="text-[10.5px] sm:text-[11px] text-black/60 font-mono">
                          K-Market, R-Kioski ja Matkahuollon pisteet
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs">{subtotal >= 100 ? '0,00 €' : '4,90 €'}</span>
                  </label>

                  <label className={`flex items-start justify-between p-3 sm:p-3.5 border cursor-pointer transition-colors ${shippingMethod === 'home' ? 'border-black bg-black/5' : 'border-black/20 hover:border-black/40'}`}>
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <input
                        type="radio"
                        name="shipping"
                        checked={shippingMethod === 'home'}
                        onChange={() => setShippingMethod('home')}
                        className="accent-black mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className="font-sans text-xs font-medium block">
                          Posti Kotiinkuljetus
                        </span>
                        <span className="text-[10.5px] sm:text-[11px] text-black/60 font-mono">
                          Sovittuun aikaan kotiovellesi
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-xs">7,90 €</span>
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3.5 sm:py-4 btn-primary text-xs uppercase tracking-[0.2em] font-medium flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{t.proceedToPayment}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* STEP 2: MAKSU (PAYMENT) */}
          {step === 2 && (
            <div className="space-y-6 sm:space-y-8 animate-fadeIn">
              <div>
                <h3 className="font-editorial text-2xl sm:text-3xl font-normal mb-1">
                  {t.paymentMethods}
                </h3>
                <p className="text-xs font-sans text-black/60">
                  {language === 'fi' ? 'Valitse haluamasi turvallinen suomalainen maksutapa.' : 'Select your preferred secure Finnish payment method.'}
                </p>
              </div>

              <div className="space-y-2.5 sm:space-y-3">
                {/* 1. Verkkopankki */}
                <div className={`p-3.5 sm:p-4 border transition-colors ${paymentMethod === 'verkkopankki' ? 'border-black bg-black/5' : 'border-black/20'}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'verkkopankki'}
                      onChange={() => setPaymentMethod('verkkopankki')}
                      className="accent-black cursor-pointer"
                    />
                    <span className="text-xs font-sans font-medium">{t.verkkopankki}</span>
                  </label>
                  {paymentMethod === 'verkkopankki' && (
                    <div className="mt-3.5 pt-3 border-t border-black/10">
                      <p className="text-[10.5px] sm:text-[11px] font-mono text-black/60 mb-2">{t.selectBank}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                        {['OP', 'Nordea', 'Danske Bank', 'S-Pankki', 'Säästöpankki', 'Aktia', 'POP Pankki', 'Ålandsbanken'].map((bank) => (
                          <button
                            type="button"
                            key={bank}
                            onClick={() => setSelectedBank(bank)}
                            className={`py-2 text-[10.5px] sm:text-[11px] font-mono border cursor-pointer ${
                              selectedBank === bank
                                ? 'border-black bg-black text-white font-medium'
                                : 'border-black/20 hover:border-black'
                            }`}
                          >
                            {bank}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. MobilePay */}
                <div className={`p-3.5 sm:p-4 border transition-colors ${paymentMethod === 'mobilepay' ? 'border-black bg-black/5' : 'border-black/20'}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'mobilepay'}
                      onChange={() => setPaymentMethod('mobilepay')}
                      className="accent-black cursor-pointer"
                    />
                    <span className="text-xs font-sans font-medium">{t.mobilepay}</span>
                  </label>
                  {paymentMethod === 'mobilepay' && (
                    <div className="mt-2.5 text-xs font-mono text-black/60 pl-6">
                      Saat maksupyynnön numeroon {phone}.
                    </div>
                  )}
                </div>

                {/* 3. Klarna */}
                <div className={`p-3.5 sm:p-4 border transition-colors ${paymentMethod === 'klarna' ? 'border-black bg-black/5' : 'border-black/20'}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'klarna'}
                      onChange={() => setPaymentMethod('klarna')}
                      className="accent-black cursor-pointer"
                    />
                    <span className="text-xs font-sans font-medium">{t.klarna}</span>
                  </label>
                </div>

                {/* 4. Korttimaksu */}
                <div className={`p-3.5 sm:p-4 border transition-colors ${paymentMethod === 'card' ? 'border-black bg-black/5' : 'border-black/20'}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'card'}
                      onChange={() => setPaymentMethod('card')}
                      className="accent-black cursor-pointer"
                    />
                    <span className="text-xs font-sans font-medium">{t.cards}</span>
                  </label>
                </div>

                {/* 5. Apple Pay */}
                <div className={`p-3.5 sm:p-4 border transition-colors ${paymentMethod === 'applepay' ? 'border-black bg-black/5' : 'border-black/20'}`}>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === 'applepay'}
                      onChange={() => setPaymentMethod('applepay')}
                      className="accent-black cursor-pointer"
                    />
                    <span className="text-xs font-sans font-medium">{t.applepay}</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3 sm:gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 sm:px-6 py-3.5 sm:py-4 btn-secondary text-xs uppercase tracking-[0.16em] cursor-pointer"
                >
                  Takaisin
                </button>
                <button
                  type="button"
                  onClick={handleConfirmOrder}
                  className="flex-1 py-3.5 sm:py-4 btn-primary text-xs uppercase tracking-[0.2em] font-medium cursor-pointer"
                >
                  {t.confirmPayment.replace('{amount}', formatPrice(total))}
                </button>
              </div>

              <div className="pt-2 sm:pt-4 flex items-center justify-center gap-2 text-xs font-mono text-black/50 text-center">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>SSL-salattu 256-bittinen yhteys · 14 päivän palautusoikeus</span>
              </div>
            </div>
          )}

          {/* STEP 3: VAHVISTUS (CONFIRMATION RECEIPT) */}
          {step === 3 && (
            <div className="space-y-5 sm:space-y-6 animate-fadeIn py-4 sm:py-6">
              <div className="w-12 h-12 border border-black flex items-center justify-center mb-4 sm:mb-6">
                <Check className="w-6 h-6 stroke-[1.5]" />
              </div>

              <h3 className="font-editorial text-3xl sm:text-4xl md:text-5xl font-normal">
                {t.orderConfirmed}
              </h3>

              <div className="p-4 sm:p-5 border border-black/15 bg-black/5 font-mono text-xs space-y-1">
                <p><strong>{t.orderNumber}:</strong> {orderNumber}</p>
                <p><strong>Vastaanottaja:</strong> {firstName} {lastName}</p>
                <p><strong>Toimitusosoite:</strong> {street}, {postalCode} {city}</p>
                <p><strong>Toimitustapa:</strong> {shippingMethod.toUpperCase()}</p>
                <p><strong>Kokonaissumma:</strong> {formatPrice(total)} (sis. ALV 24 %)</p>
              </div>

              <p className="text-xs sm:text-sm font-sans text-black/70 leading-relaxed">
                {t.thankYou}
              </p>

              <div className="pt-4 sm:pt-6">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-8 py-3.5 sm:py-4 btn-primary text-xs uppercase tracking-[0.2em] font-medium cursor-pointer"
                >
                  {t.backToStore}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: ORDER SUMMARY */}
        <div className="md:col-span-5 bg-black/5 p-5 sm:p-8 border border-black/10 h-fit space-y-4 sm:space-y-6">
          <h4 className="font-editorial text-xl sm:text-2xl font-normal border-b border-black/10 pb-2 sm:pb-3">
            {language === 'fi' ? 'Tilauksen yhteenveto' : 'Order Summary'}
          </h4>

          <div className="space-y-3 max-h-60 sm:max-h-72 overflow-y-auto divide-y divide-black/10">
            {items.map((item) => (
              <div key={`${item.product.id}-${item.size}`} className="pt-2.5 sm:pt-3 flex justify-between gap-3 text-xs font-mono">
                <div>
                  <span className="font-medium">{item.product.name[language]}</span>
                  <div className="text-[10.5px] sm:text-[11px] text-black/50">
                    Koko {item.size} · Määrä {item.quantity}
                  </div>
                </div>
                <span>{formatPrice(item.product.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-black/10 pt-3 sm:pt-4 space-y-1.5 sm:space-y-2 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-black/60">Välisumma</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-black/60">Toimitus</span>
              <span>{formatPrice(shippingCost)}</span>
            </div>
            <div className="flex justify-between text-sm sm:text-base font-medium pt-2 border-t border-black/10">
              <span>Yhteensä</span>
              <span>{formatPrice(total)}</span>
            </div>
            <p className="text-[10px] text-black/50 text-right">
              sis. ALV 24 % ({formatPrice((total * 0.24) / 1.24)})
            </p>
          </div>

          <div className="pt-3 sm:pt-4 border-t border-black/10">
            <span className="text-[10px] font-mono tracking-wider uppercase text-black/50 block mb-2">
              TUETUT MAKSUTAVAT:
            </span>
            <PaymentIcons />
          </div>
        </div>
      </div>
    </div>
  );
};
