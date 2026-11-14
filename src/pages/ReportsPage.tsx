import React from 'react';
import { FileBarChart, ArrowDownToLine, ShoppingCart, WalletCards, ReceiptIndianRupee, TrendingUp, Users } from 'lucide-react';
import { api } from '../services/api';

interface ReportsPageProps {
  onNotify: (msg: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({ onNotify }) => {
  const downloadReport = async (type: string, title: string) => {
    try {
      await api.downloadReportCSV(type);
      onNotify(`${title} downloaded successfully as CSV`);
    } catch {
      onNotify(`Failed to download ${title}`);
    }
  };

  const reportItems = [
    {
      title: 'Purchase Orders Report',
      type: 'purchase-orders',
      desc: 'Complete procurement list, suppliers, line item totals, GST, and fulfillment status.',
      icon: <ShoppingCart size={22} />,
      updated: 'Live Database Sync',
    },
    {
      title: 'Employee Wages & Salary Report',
      type: 'wages',
      desc: 'Employee monthly commitment, gross wages, authorized deductions, net payable, and balances.',
      icon: <WalletCards size={22} />,
      updated: 'Live Database Sync',
    },
    {
      title: 'Employee Expenses & Reimbursements',
      type: 'expenses',
      desc: 'Itemized travel, fuel, logistics spending claims with approval notes and payment balances.',
      icon: <ReceiptIndianRupee size={22} />,
      updated: 'Live Database Sync',
    },
    {
      title: 'Verified Profit & Loss Report',
      type: 'profit-loss',
      desc: 'Traceable PO financial results derived from verified procurement invoices and recognized sales revenue.',
      icon: <TrendingUp size={22} />,
      updated: 'Live Database Sync',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
        <h2 className="text-base font-bold text-[#064D2B]">Centralized Financial &amp; Operations Reports</h2>
        <p className="text-xs text-gray-500 mt-1">
          Export verified CSV records compatible with Excel, Tally, and corporate accounting software.
        </p>
      </div>

      <section className="report-grid">
        {reportItems.map((item) => (
          <article className="report-card" key={item.title}>
            <div className="report-icon">{item.icon}</div>
            <div className="flex-1 pr-2">
              <h3>{item.title}</h3>
              <p>{item.desc}</p>
              <span>{item.updated}</span>
            </div>
            <button
              onClick={() => downloadReport(item.type, item.title)}
              title="Download CSV"
              className="hover:bg-emerald-100 transition"
            >
              <ArrowDownToLine size={16} />
            </button>
          </article>
        ))}
      </section>
    </div>
  );
};

