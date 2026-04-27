import React, { useState } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { useData } from '../contexts/DataContext';
import { Target, Users, Edit2, Check, X, TrendingUp } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

const Targets: React.FC = () => {
  const { salesReps, salesTargets, setSalesTargets, updateSalesTarget , formatCurrency } = useData();
  const { notify } = useNotification();
  const { t } = useLanguage();
  
  // Format for current month e.g., "2024-10"
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const handleEdit = (targetId: string, currentTarget: number) => {
    setEditingId(targetId);
    setEditValue(currentTarget.toString());
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (targetId: string, salesRepId: string) => {
    const numericValue = Number(editValue);
    if (!isNaN(numericValue) && numericValue >= 0) {
      try {
        setIsSaving(true);
        // Optimistic UI update
        setSalesTargets(targets => 
          targets.map(t => t.id === targetId ? { ...t, target: numericValue } : t)
        );
        await updateSalesTarget(salesRepId, selectedMonth, numericValue);
        notify.success('Sales target updated successfully');
      } catch (error: any) {
        notify.error('Failed to save sales target: ' + (error.message || 'Unknown error'));
        // We could revert the optimistic update here if needed
      } finally {
        setIsSaving(false);
      }
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleCreateMissingTargets = () => {
    const existingRepIdsForMonth = new Set(
      salesTargets.filter(t => t.month === selectedMonth).map(t => t.salesRepId)
    );

    const missingTargets = salesReps
      .filter(rep => !existingRepIdsForMonth.has(rep.id))
      .map(rep => ({
        id: `T-${Date.now()}-${rep.id}`,
        salesRepId: rep.id,
        month: selectedMonth,
        target: 0
      }));

    if (missingTargets.length > 0) {
      setSalesTargets([...salesTargets, ...missingTargets]);
    }
  };

  // Auto-create missing targets on render for the selected month to make table complete
  React.useEffect(() => {
    handleCreateMissingTargets();
  }, [selectedMonth, salesReps]);

  const monthTargets = salesTargets.filter(t => t.month === selectedMonth);

  // Group by Team for display
  const targetsWithRepData = monthTargets.map(t => {
    const rep = salesReps.find(r => r.id === t.salesRepId);
    return {
      ...t,
      repName: rep?.name || 'Unknown',
      team: rep?.team || 'Unknown',
    };
  }).sort((a, b) => a.repName.localeCompare(b.repName));

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-headline font-bold text-on-surface tracking-tight mb-2">
            {t('nav.targets')}
          </h1>
          <p className="text-on-surface-variant flex items-center gap-2">
            <Target size={16} />{t('target.subtitle')}</p>
        </div>
        
        <div className="flex bg-surface-container rounded-xl p-1 w-max items-center">
          <input 
            type="month" 
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-transparent px-4 py-2 outline-none text-sm font-medium text-on-surface cursor-pointer"
          />
        </div>
      </div>

      <div className="bg-surface-container-lowest border ghost-border rounded-2xl editorial-shadow overflow-hidden">
        <div className="p-4 border-b ghost-border bg-surface-container-low/50 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-container text-primary flex items-center justify-center flex-shrink-0">
            <TrendingUp size={20} />
          </div>
          <div>
            <h2 className="text-lg font-headline font-semibold text-on-surface">{t('target.adjustments')}</h2>
            <p className="text-sm text-on-surface-variant">{t('target.description')}</p>
          </div>
        </div>
        
        <div className="overflow-x-auto hidden md:block">
          <table className="w-full">
            <thead>
              <tr className="bg-surface-container-low/30 border-b ghost-border">
                <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('table.representative')}</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('table.team')}</th>
                <th className="px-6 py-4 text-right text-xs font-semibold text-on-surface-variant uppercase tracking-wider">{t('table.target_amount')}</th>
                <th className="px-6 py-4 text-center text-xs font-semibold text-on-surface-variant uppercase tracking-wider w-24">{t('table.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y ghost-border">
              {targetsWithRepData.map(target => (
                <tr key={target.id} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                        {target.repName.slice(0, 2)}
                      </div>
                      <span className="font-medium text-on-surface text-sm">{target.repName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-surface-container-high text-on-surface-variant">
                      {target.team}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {editingId === target.id ? (
                      <input
                        type="number"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full max-w-[150px] ml-auto px-3 py-1.5 bg-surface-container border border-primary/50 focus:border-primary rounded-lg text-sm text-right focus:ring-1 focus:ring-primary outline-none"
                        autoFocus
                      />
                    ) : (
                      <span className="text-sm font-semibold text-on-surface font-mono">{formatCurrency(target.target)}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-center gap-2">
                       {editingId === target.id ? (
                         <>
                           <button onClick={() => handleSave(target.id, target.salesRepId)} disabled={isSaving} className="p-1.5 text-primary hover:bg-primary-container/30 rounded-lg transition-colors">
                             <Check size={16} />
                           </button>
                           <button onClick={handleCancel} className="p-1.5 text-outline hover:text-error hover:bg-error-container/30 rounded-lg transition-colors">
                             <X size={16} />
                           </button>
                         </>
                       ) : (
                         <button 
                           onClick={() => handleEdit(target.id, target.target)}
                           className="p-1.5 text-outline hover:text-primary hover:bg-primary-container/30 rounded-lg transition-colors"
                         >
                           <Edit2 size={16} />
                         </button>
                       )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {targetsWithRepData.length === 0 && (
             <div className="p-8 text-center text-on-surface-variant text-sm">
                No users or sales reps found in the system.
             </div>
          )}
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden flex flex-col p-4 gap-4 bg-surface">
          {targetsWithRepData.map((target) => (
            <div key={target.id} className="bg-surface-container-lowest border ghost-border rounded-2xl p-4 editorial-shadow flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-sm uppercase">
                    {target.repName.slice(0, 2)}
                  </div>
                  <div>
                    <span className="block font-semibold text-on-surface leading-tight">{target.repName}</span>
                    <span className="inline-flex items-center px-1.5 py-0.5 mt-0.5 rounded text-[10px] font-medium bg-surface-container-high text-on-surface-variant">
                      {target.team}
                    </span>
                  </div>
                </div>
                {editingId !== target.id && (
                  <button 
                    onClick={() => handleEdit(target.id, target.target)}
                    className="p-2 text-outline hover:bg-surface-container rounded-lg transition-colors"
                  >
                    <Edit2 size={18} />
                  </button>
                )}
              </div>
              
              <div className="pt-3 border-t ghost-border">
                {editingId === target.id ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="flex-1 px-4 py-3 bg-surface-container border border-primary/50 focus:border-primary rounded-xl text-base focus:ring-1 focus:ring-primary outline-none"
                      autoFocus
                      placeholder="Enter target amount"
                    />
                    <button onClick={() => handleSave(target.id, target.salesRepId)} disabled={isSaving} className="p-3 bg-primary-container text-primary hover:bg-primary hover:text-white rounded-xl transition-colors">
                      <Check size={20} />
                    </button>
                    <button onClick={handleCancel} className="p-3 bg-error/10 text-error hover:bg-error/20 rounded-xl transition-colors">
                      <X size={20} />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-on-surface-variant">{t('table.target_amount')}</span>
                    <span className="text-xl font-bold text-on-surface font-mono">{formatCurrency(target.target)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
          {targetsWithRepData.length === 0 && (
             <div className="p-8 text-center text-on-surface-variant text-sm">
                No users or sales reps found in the system.
             </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Targets;
