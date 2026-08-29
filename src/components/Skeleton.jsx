import React from 'react';

// ── Primitive ───────────────────────────────────────────────
// Usage : <Skeleton className="h-4 w-32" />
const Skeleton = ({ className = '' }) => (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
);

// ── Table rows ──────────────────────────────────────────────
// rows  : nombre de lignes
// cols  : largeurs des colonnes ex. ['w-1/3','w-1/4','w-1/5','w-1/6']
Skeleton.Table = function SkeletonTable({ rows = 6, cols = ['w-2/5', 'w-1/5', 'w-1/5', 'w-1/6'] }) {
    return (
        <div className="space-y-0 divide-y divide-gray-50">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5">
                    {cols.map((w, j) => (
                        <div key={j} className={`animate-pulse bg-gray-200 rounded h-3.5 ${w}`} />
                    ))}
                </div>
            ))}
        </div>
    );
};

// ── KPI cards (Dashboard) ───────────────────────────────────
Skeleton.KpiGrid = function SkeletonKpiGrid({ count = 4 }) {
    return (
        <div className={`grid gap-4 grid-cols-2 md:grid-cols-${count}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-gray-100 p-5 flex items-center gap-4 animate-pulse">
                    <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />
                    <div className="space-y-2 flex-1">
                        <div className="h-2.5 bg-gray-200 rounded w-3/4" />
                        <div className="h-6 bg-gray-300 rounded w-1/2" />
                        <div className="h-2 bg-gray-200 rounded w-2/3" />
                    </div>
                </div>
            ))}
        </div>
    );
};

// ── Card list (Annuaire fournisseurs, Rapports…) ────────────
Skeleton.CardList = function SkeletonCardList({ count = 4, avatar = false }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center gap-4 animate-pulse">
                    {avatar && <div className="w-10 h-10 rounded-xl bg-gray-200 flex-shrink-0" />}
                    <div className="flex-1 space-y-2">
                        <div className="h-3.5 bg-gray-200 rounded w-2/5" />
                        <div className="h-2.5 bg-gray-100 rounded w-3/5" />
                    </div>
                    <div className="h-6 w-16 bg-gray-100 rounded-full" />
                </div>
            ))}
        </div>
    );
};

// ── Logs / liste dense ──────────────────────────────────────
Skeleton.LogList = function SkeletonLogList({ rows = 8 }) {
    return (
        <div className="divide-y divide-gray-50">
            {Array.from({ length: rows }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                    <div className="w-2 h-2 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="w-28 h-2.5 bg-gray-200 rounded" />
                    <div className="w-16 h-2 bg-gray-100 rounded" />
                    <div className="flex-1 h-2.5 bg-gray-200 rounded" />
                    <div className="w-12 h-2 bg-gray-100 rounded" />
                </div>
            ))}
        </div>
    );
};

// ── Employee list (AdminDossiers) ───────────────────────────
Skeleton.EmployeeList = function SkeletonEmployeeList({ count = 5 }) {
    return (
        <div className="divide-y divide-gray-50">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3.5 animate-pulse">
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                    <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                        <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                    </div>
                    <div className="h-5 w-20 bg-gray-100 rounded-full" />
                </div>
            ))}
        </div>
    );
};

// ── Expense rows ────────────────────────────────────────────
Skeleton.ExpenseList = function SkeletonExpenseList({ count = 4 }) {
    return (
        <div className="divide-y divide-gray-50">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 px-5 py-3 animate-pulse">
                    <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-gray-200 rounded w-2/5" />
                        <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                    </div>
                    <div className="h-5 w-16 bg-gray-100 rounded-full" />
                </div>
            ))}
        </div>
    );
};

// ── Full page (App initial load) ────────────────────────────
Skeleton.Page = function SkeletonPage() {
    return (
        <div className="flex h-screen overflow-hidden bg-gray-100">
            {/* Sidebar skeleton */}
            <div className="hidden md:flex flex-col w-64 bg-[#1a1a1a] flex-shrink-0 p-4 gap-3">
                <div className="flex items-center gap-2.5 p-2 mb-2">
                    <div className="w-8 h-8 rounded-md bg-white/10 animate-pulse" />
                    <div className="h-3 bg-white/10 rounded w-24 animate-pulse" />
                </div>
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="h-9 rounded-lg bg-white/5 animate-pulse" style={{ animationDelay: `${i * 60}ms` }} />
                ))}
            </div>
            {/* Contenu skeleton */}
            <div className="flex-1 flex flex-col overflow-hidden">
                <div className="h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
                    <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
                    <div className="flex-1 h-8 bg-gray-100 rounded-xl animate-pulse max-w-md mx-auto" />
                </div>
                <div className="flex-1 p-6 space-y-4 overflow-hidden">
                    <Skeleton.KpiGrid count={4} />
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-2 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="h-12 px-5 flex items-center border-b border-gray-100 animate-pulse">
                                <div className="h-3 w-32 bg-gray-200 rounded" />
                            </div>
                            <Skeleton.Table rows={5} />
                        </div>
                        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                            <div className="h-12 px-5 flex items-center border-b border-gray-100 animate-pulse">
                                <div className="h-3 w-24 bg-gray-200 rounded" />
                            </div>
                            <Skeleton.CardList count={4} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Skeleton;
