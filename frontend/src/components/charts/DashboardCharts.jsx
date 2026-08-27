import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Doughnut, Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const chartDarkOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom',
      labels: {
        color: '#9ca3af',
        font: { family: 'Inter', size: 12 },
        padding: 16,
        usePointStyle: true,
        pointStyle: 'circle',
      },
    },
    tooltip: {
      backgroundColor: '#1f293d',
      titleColor: '#fff',
      bodyColor: '#e5e7eb',
      borderColor: 'rgba(255, 255, 255, 0.1)',
      borderWidth: 1,
      padding: 10,
      boxPadding: 4,
      usePointStyle: true,
    },
  },
};

export const AttendanceDoughnutChart = ({ present = 0, absent = 0, leave = 0, notMarked = 0 }) => {
  const total = present + absent + leave + notMarked;

  const data = {
    labels: ['Present', 'Absent', 'On Leave', 'Not Marked'],
    datasets: [
      {
        data: total > 0 ? [present, absent, leave, notMarked] : [1, 0, 0, 0],
        backgroundColor: [
          '#10b981', // emerald
          '#f43f5e', // rose
          '#f59e0b', // amber
          '#64748b', // slate
        ],
        borderWidth: 2,
        borderColor: '#111827',
      },
    ],
  };

  const options = {
    ...chartDarkOptions,
    cutout: '70%',
  };

  return (
    <div style={{ position: 'relative', height: '240px' }}>
      <Doughnut data={data} options={options} />
      <div
        style={{
          position: 'absolute',
          top: '42%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: '1.4rem', fontWeight: 700, color: '#fff', fontFamily: 'var(--font-display)' }}>
          {present}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>
          Present Today
        </div>
      </div>
    </div>
  );
};

export const MonthlyTrendLineChart = ({ trendData = [] }) => {
  const defaultLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const labels = trendData.length > 0 ? trendData.map((d) => d.monthName || d.label) : defaultLabels.slice(0, 8);
  const values = trendData.length > 0 ? trendData.map((d) => d.rate || d.value) : [85, 88, 92, 89, 94, 91, 95, 96];

  const data = {
    labels,
    datasets: [
      {
        label: 'Attendance Rate (%)',
        data: values,
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
        tension: 0.35,
        fill: true,
        pointBackgroundColor: '#3b82f6',
        pointBorderColor: '#fff',
        pointHoverRadius: 6,
      },
    ],
  };

  const options = {
    ...chartDarkOptions,
    scales: {
      x: {
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: { color: '#9ca3af' },
      },
      y: {
        min: 50,
        max: 100,
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
        ticks: {
          color: '#9ca3af',
          callback: (val) => `${val}%`,
        },
      },
    },
  };

  return (
    <div style={{ height: '240px' }}>
      <Line data={data} options={options} />
    </div>
  );
};

export const DepartmentBarChart = ({ deptCounts = {} }) => {
  const departments = Object.keys(deptCounts).length > 0 ? Object.keys(deptCounts) : ['ICT', 'Mathematics', 'Physics', 'English', 'Science'];
  const counts = Object.keys(deptCounts).length > 0 ? Object.values(deptCounts) : [4, 6, 3, 5, 2];

  const data = {
    labels: departments,
    datasets: [
      {
        label: 'Faculty Count',
        data: counts,
        backgroundColor: 'rgba(139, 92, 246, 0.75)',
        hoverBackgroundColor: 'rgba(139, 92, 246, 1)',
        borderRadius: 6,
      },
    ],
  };

  const options = {
    ...chartDarkOptions,
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: '#9ca3af', font: { size: 11 } },
      },
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1, color: '#9ca3af' },
        grid: { color: 'rgba(255, 255, 255, 0.05)' },
      },
    },
  };

  return (
    <div style={{ height: '240px' }}>
      <Bar data={data} options={options} />
    </div>
  );
};

export const SalaryOverviewChart = ({ gross = 0, deductions = 0, net = 0 }) => {
  const data = {
    labels: ['Net Salary Disbursed', 'Absence & Leave Deductions'],
    datasets: [
      {
        data: gross > 0 ? [net, deductions] : [1, 0],
        backgroundColor: ['#06b6d4', '#f43f5e'],
        borderWidth: 2,
        borderColor: '#111827',
      },
    ],
  };

  const options = {
    ...chartDarkOptions,
    cutout: '65%',
  };

  return (
    <div style={{ position: 'relative', height: '240px' }}>
      <Doughnut data={data} options={options} />
      <div
        style={{
          position: 'absolute',
          top: '42%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#06b6d4', fontFamily: 'var(--font-display)' }}>
          Rs. {net.toLocaleString()}
        </div>
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', textTransform: 'uppercase' }}>
          Net Payroll
        </div>
      </div>
    </div>
  );
};
