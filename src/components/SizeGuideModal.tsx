import React from 'react';
import { Language, translations } from '../types';
import { X } from 'lucide-react';

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const SizeGuideModal: React.FC<SizeGuideModalProps> = ({
  isOpen,
  onClose,
  language,
}) => {
  const t = translations[language];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px]"
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white border border-black p-6 sm:p-10 shadow-2xl z-10 max-h-[90vh] overflow-y-auto animate-fadeIn">
        <div className="flex items-center justify-between pb-4 border-b border-black/10 mb-6">
          <h3 className="font-editorial text-2xl sm:text-3xl font-normal">
            {t.pdp.sizeGuide}
          </h3>
          <button
            onClick={onClose}
            className="p-2 text-black/60 hover:text-black"
          >
            <X className="w-5 h-5 stroke-[1.5]" />
          </button>
        </div>

        <p className="text-xs font-sans text-black/70 mb-6 leading-relaxed">
          All dimensions are body measurements in centimetres (cm). If your measurements fall between two sizes, we recommend opting for the larger size for a relaxed Nordic silhouette.
        </p>

        {/* Women's Table */}
        <div className="mb-8">
          <h4 className="font-mono text-xs uppercase tracking-wider text-black/50 mb-3">
            WOMEN (XS – XL)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-black/20 text-black/50">
                  <th className="py-2 pr-4 font-normal">Size / EU</th>
                  <th className="py-2 pr-4 font-normal">Bust (cm)</th>
                  <th className="py-2 pr-4 font-normal">Waist (cm)</th>
                  <th className="py-2 font-normal">Hips (cm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                <tr>
                  <td className="py-2.5 font-medium">XS / 34</td>
                  <td className="py-2.5">80–84</td>
                  <td className="py-2.5">62–66</td>
                  <td className="py-2.5">88–92</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium">S / 36</td>
                  <td className="py-2.5">84–88</td>
                  <td className="py-2.5">66–70</td>
                  <td className="py-2.5">92–96</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium">M / 38</td>
                  <td className="py-2.5">88–92</td>
                  <td className="py-2.5">70–74</td>
                  <td className="py-2.5">96–100</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium">L / 40</td>
                  <td className="py-2.5">92–96</td>
                  <td className="py-2.5">74–78</td>
                  <td className="py-2.5">100–104</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium">XL / 42</td>
                  <td className="py-2.5">96–102</td>
                  <td className="py-2.5">78–84</td>
                  <td className="py-2.5">104–110</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Men's Table */}
        <div>
          <h4 className="font-mono text-xs uppercase tracking-wider text-black/50 mb-3">
            MEN (S – XL / 46 – 54)
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-black/20 text-black/50">
                  <th className="py-2 pr-4 font-normal">Size / EU</th>
                  <th className="py-2 pr-4 font-normal">Chest (cm)</th>
                  <th className="py-2 pr-4 font-normal">Waist (cm)</th>
                  <th className="py-2 font-normal">Inseam (cm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/10">
                <tr>
                  <td className="py-2.5 font-medium">S / 46</td>
                  <td className="py-2.5">90–94</td>
                  <td className="py-2.5">78–82</td>
                  <td className="py-2.5">81</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium">M / 48–50</td>
                  <td className="py-2.5">96–102</td>
                  <td className="py-2.5">84–88</td>
                  <td className="py-2.5">82</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium">L / 52</td>
                  <td className="py-2.5">104–108</td>
                  <td className="py-2.5">90–94</td>
                  <td className="py-2.5">83</td>
                </tr>
                <tr>
                  <td className="py-2.5 font-medium">XL / 54</td>
                  <td className="py-2.5">110–116</td>
                  <td className="py-2.5">96–102</td>
                  <td className="py-2.5">84</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-black/10 text-center">
          <button
            onClick={onClose}
            className="w-full py-3 btn-secondary text-xs uppercase tracking-[0.18em]"
          >
            Close Size Guide
          </button>
        </div>
      </div>
    </div>
  );
};
