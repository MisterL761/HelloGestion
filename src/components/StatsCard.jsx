import React from 'react';

const StatsCard = ({ title, value, icon: Icon, color, onClick, active }) => {
    const colorClasses = {
        blue: {
            bg: 'bg-blue-50',
            text: 'text-blue-600',
            iconBg: 'bg-blue-100',
            border: 'border-blue-200',
            shadow: 'shadow-blue-100',
            ring: 'ring-blue-400'
        },
        green: {
            bg: 'bg-green-50',
            text: 'text-green-600',
            iconBg: 'bg-green-100',
            border: 'border-green-200',
            shadow: 'shadow-green-100',
            ring: 'ring-green-400'
        },
        red: {
            bg: 'bg-red-50',
            text: 'text-red-600',
            iconBg: 'bg-red-100',
            border: 'border-red-200',
            shadow: 'shadow-red-100',
            ring: 'ring-red-400'
        },
        yellow: {
            bg: 'bg-yellow-50',
            text: 'text-yellow-600',
            iconBg: 'bg-yellow-100',
            border: 'border-yellow-200',
            shadow: 'shadow-yellow-100',
            ring: 'ring-yellow-400'
        }
    };

    const colors = colorClasses[color] || colorClasses.blue;

    return (
        <div
            onClick={onClick}
            className={`${colors.bg} border-2 ${colors.border} p-4 md:p-6 xl:p-8 rounded-xl shadow-sm transition-all
                ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02]' : ''}
                ${active ? `ring-2 ring-offset-1 ${colors.ring} scale-[1.03] shadow-md` : ''}
            `}
        >
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-xs md:text-sm xl:text-base text-gray-500 font-medium mb-1 md:mb-2">{title}</p>
                    <p className={`text-xl md:text-2xl xl:text-4xl font-bold ${colors.text}`}>{value}</p>
                </div>
                <div className={`${colors.iconBg} p-2 md:p-3 xl:p-4 rounded-full`}>
                    <Icon className={`${colors.text} w-5 h-5 md:w-6 md:h-6 xl:w-8 xl:h-8`} />
                </div>
            </div>
        </div>
    );
};

export default StatsCard;
