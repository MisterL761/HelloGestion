import { Edit, Trash2, Eye } from 'lucide-react';

const ActionButtons = ({ onEdit, onDelete, onView }) => {
    return (
        <div className="flex items-center">
            <div className="w-8 lg:w-9 xl:w-10 flex justify-center">
                {onView && (
                    <button
                        onClick={onView}
                        className="text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-600 rounded p-1 lg:p-1.5 xl:p-2 transition-colors"
                        title="Voir"
                    >
                        <Eye size={16} className="lg:w-[18px] lg:h-[18px] xl:w-5 xl:h-5" />

                    </button>
                )}
            </div>
            <div className="w-8 lg:w-9 xl:w-10 flex justify-center ml-1 lg:ml-2">
                {onEdit && (
                    <button
                        onClick={onEdit}
                        className="text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-600 rounded p-1 lg:p-1.5 xl:p-2 transition-colors"
                        title="Modifier"
                    >
                        <Edit size={16} className="lg:w-[18px] lg:h-[18px] xl:w-5 xl:h-5" />
                    </button>
                )}
            </div>
            <div className="w-8 lg:w-9 xl:w-10 flex justify-center ml-1 lg:ml-2">
                {onDelete && (
                    <button
                        onClick={onDelete}
                        className="text-red-600 hover:text-white hover:bg-red-600 border border-red-600 rounded p-1 lg:p-1.5 xl:p-2 transition-colors"
                        title="Supprimer"
                    >
                        <Trash2 size={16} className="lg:w-[18px] lg:h-[18px] xl:w-5 xl:h-5" />
                    </button>
                )}
            </div>

        </div>

    );
};
export default ActionButtons;


