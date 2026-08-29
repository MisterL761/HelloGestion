import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Bot, User, Send, Upload, Trash2, FileText,
    ChevronDown, ChevronRight, Eye, X, AlertCircle
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || '/hello-gestion/php';

const CATEGORIES = [
    'Fenêtres', 'Portes', 'Volets roulants', 'Volets battants',
    'Portails', 'Pergolas', 'Stores', 'Moustiquaires', 'Domotique', 'Autre'
];

const SUGGESTIONS = [
    'Quel est notre stock actuel de consommables en rupture ?',
    'Combien avons-nous de vis en stock en ce moment ?',
    'Comment régler un volet roulant motorisé Somfy ?',
    'Quelle est la procédure de pose d\'une porte de garage sectionnelle ?',
];

// ── Typing indicator ────────────────────────────────────
const TypingIndicator = () => (
    <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-full bg-[#FFB103] flex items-center justify-center flex-shrink-0">
            <Bot size={16} className="text-white" />
        </div>
        <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
            <div className="flex gap-1 items-center h-5">
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
        </div>
    </div>
);

// ── Message bubble ──────────────────────────────────────
const MessageBubble = ({ message, onViewSource }) => {
    const isUser = message.role === 'user';

    if (isUser) {
        return (
            <div className="flex items-start gap-3 justify-end">
                <div className="bg-[#FFB103] text-[#1a1a1a] rounded-2xl rounded-tr-sm px-4 py-3 max-w-[80%] shadow-sm">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-gray-600" />
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-[#FFB103] flex items-center justify-center flex-shrink-0">
                <Bot size={16} className="text-white" />
            </div>
            <div className="flex flex-col gap-2 max-w-[80%]">
                <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                    <p className="text-sm text-gray-800 whitespace-pre-wrap">{message.content}</p>
                </div>
                {message.sources && message.sources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {message.sources.map((source, i) => (
                            <button
                                key={i}
                                onClick={() => onViewSource(source)}
                                className="flex items-center gap-1.5 bg-amber-50 text-[#FFB103] text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors border border-amber-100"
                            >
                                <Eye size={12} />
                                {source.name}
                            </button>
                        ))}
                    </div>
                )}
                {message.error && (
                    <div className="flex items-center gap-2 text-red-500 text-xs px-1">
                        <AlertCircle size={12} />
                        {message.error}
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Document item ────────────────────────────────────────
const DocItem = ({ doc, isAdmin, onDelete, onView }) => (
    <div className="flex items-center gap-2 py-2 px-3 rounded-xl hover:bg-white/10 group transition-colors">
        <FileText size={14} className="text-white/70 flex-shrink-0" />
        <div className="flex-1 min-w-0">
            <p className="text-sm text-white/90 truncate font-medium">{doc.name}</p>
            <p className="text-xs text-white/50">{doc.chunks} chunk{doc.chunks !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {doc.file_path && (
                <button
                    onClick={() => onView(doc)}
                    className="p-1 rounded-lg hover:bg-white/20 text-white/70 hover:text-white transition-colors"
                    title="Voir le PDF"
                >
                    <Eye size={13} />
                </button>
            )}
            {isAdmin && (
                <button
                    onClick={() => onDelete(doc)}
                    className="p-1 rounded-lg hover:bg-white/20 text-white/70 hover:text-red-300 transition-colors"
                    title="Supprimer"
                >
                    <Trash2 size={13} />
                </button>
            )}
        </div>
    </div>
);

// ── Main component ───────────────────────────────────────
const Assistant = ({ user }) => {
    const isAdmin = user?.role === 'admin';

    const [docs, setDocs]                   = useState([]);
    const [docsLoading, setDocsLoading]     = useState(true);
    const [messages, setMessages]           = useState([]);
    const [input, setInput]                 = useState('');
    const [isTyping, setIsTyping]           = useState(false);
    const [showManage, setShowManage]       = useState(false);
    const [sidebarOpen, setSidebarOpen]     = useState(false);
    const [expandedCats, setExpandedCats]   = useState({});

    // Upload state
    const [uploadFile, setUploadFile]       = useState(null);
    const [uploadCategory, setUploadCategory] = useState('Autre');
    const [uploading, setUploading]         = useState(false);
    const [uploadError, setUploadError]     = useState('');
    const [dragOver, setDragOver]           = useState(false);

    // Duplicate dialog
    const [duplicateDoc, setDuplicateDoc]   = useState(null);
    const [pendingUpload, setPendingUpload] = useState(null);

    // PDF viewer
    const [viewingPdf, setViewingPdf]       = useState(null);

    const messagesEndRef = useRef(null);
    const textareaRef    = useRef(null);
    const fileInputRef   = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => { scrollToBottom(); }, [messages, isTyping]);

    const fetchDocs = useCallback(async () => {
        try {
            setDocsLoading(true);
            const res  = await fetch(`${API_BASE}/assistant_docs.php`, { credentials: 'include' });
            const data = await res.json();
            if (data.success) setDocs(data.documents || []);
        } finally {
            setDocsLoading(false);
        }
    }, []);

    useEffect(() => { fetchDocs(); }, [fetchDocs]);

    // Group docs by category
    const docsByCategory = docs.reduce((acc, doc) => {
        const cat = doc.category || 'Autre';
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push(doc);
        return acc;
    }, {});

    const toggleCat = (cat) => {
        setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    // ── Send message ──────────────────────────────────────

    const handleSend = async (question) => {
        const q = (question || input).trim();
        if (!q) return;

        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: q }]);
        setIsTyping(true);

        try {
            const res  = await fetch(`${API_BASE}/assistant_ask.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ question: q }),
            });
            const data = await res.json();

            if (data.success) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: data.answer,
                    sources: data.sources || [],
                }]);
            } else {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: 'Une erreur est survenue lors du traitement de votre question.',
                    error: data.message,
                    sources: [],
                }]);
            }
        } catch {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: 'Impossible de contacter le serveur. Vérifiez votre connexion.',
                sources: [],
            }]);
        } finally {
            setIsTyping(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // ── Delete doc ────────────────────────────────────────

    const handleDeleteDoc = async (doc) => {
        if (!window.confirm(`Supprimer le document "${doc.name}" ?`)) return;
        try {
            await fetch(`${API_BASE}/assistant_docs.php`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ id: doc.id }),
            });
            setDocs(prev => prev.filter(d => d.id !== doc.id));
        } catch { /* ignore */ }
    };

    // ── Upload ────────────────────────────────────────────

    const doUpload = async (file, category, force = false) => {
        setUploading(true);
        setUploadError('');

        const fd = new FormData();
        fd.append('file', file);
        fd.append('category', category);
        if (force) fd.append('force', 'true');

        try {
            const res  = await fetch(`${API_BASE}/assistant_upload.php`, {
                method: 'POST',
                credentials: 'include',
                body: fd,
            });
            const data = await res.json();

            if (data.success) {
                await fetchDocs();
                setUploadFile(null);
                setUploadCategory('Autre');
                setUploadError('');
                setDuplicateDoc(null);
                setPendingUpload(null);
            } else if (data.duplicate) {
                setDuplicateDoc(data.doc_name);
                setPendingUpload({ file, category });
            } else {
                setUploadError(data.message || 'Erreur lors de l\'upload.');
            }
        } catch {
            setUploadError('Erreur réseau lors de l\'upload.');
        } finally {
            setUploading(false);
        }
    };

    const handleUploadSubmit = (e) => {
        e.preventDefault();
        if (!uploadFile) return;
        doUpload(uploadFile, uploadCategory, false);
    };

    const handleForceReplace = () => {
        if (pendingUpload) {
            doUpload(pendingUpload.file, pendingUpload.category, true);
        }
    };

    const handleFileDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type === 'application/pdf') {
            setUploadFile(file);
        }
    };

    // ── View PDF ──────────────────────────────────────────

    const handleViewSource = (source) => {
        if (source.file_path) {
            setViewingPdf(source);
        }
    };

    const handleViewDoc = (doc) => {
        if (doc.file_path) {
            setViewingPdf({ name: doc.name, file_path: doc.file_path });
        }
    };

    // ── Render ────────────────────────────────────────────

    return (
        <div className="flex h-[calc(100vh-8rem)] gap-4 md:gap-6">

            {/* ── Sidebar (desktop) / Drawer (mobile) ── */}
            <>
                {/* Mobile overlay */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/40 z-30 md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}

                <div className={[
                    'bg-[#FFB103] rounded-2xl flex flex-col overflow-hidden',
                    'md:w-72 md:flex-shrink-0',
                    // Mobile: fixed drawer
                    'fixed inset-y-0 left-0 z-40 w-[85vw] max-w-[300px] rounded-none',
                    'transition-transform duration-300',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0 md:relative md:inset-auto md:z-auto',
                ].join(' ')}>

                    {/* Sidebar header */}
                    <div className="p-4 border-b border-white/20 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Bot size={20} className="text-white" />
                            <h2 className="text-base font-bold text-white">Documents</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            {isAdmin && (
                                <button
                                    onClick={() => setShowManage(!showManage)}
                                    className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${
                                        showManage
                                            ? 'bg-white text-[#FFB103]'
                                            : 'bg-white/20 text-white hover:bg-white/30'
                                    }`}
                                >
                                    Gérer
                                </button>
                            )}
                            <button
                                onClick={() => setSidebarOpen(false)}
                                className="md:hidden text-white/70 hover:text-white p-1"
                            >
                                <X size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Upload zone (admin) */}
                    {isAdmin && showManage && (
                        <div className="p-4 border-b border-white/20 space-y-3">
                            <p className="text-xs font-bold uppercase tracking-widest text-white/50">Ajouter un document</p>

                            {/* Drag & drop zone */}
                            <div
                                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                onDragLeave={() => setDragOver(false)}
                                onDrop={handleFileDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
                                    dragOver
                                        ? 'border-white bg-white/20'
                                        : uploadFile
                                        ? 'border-green-300 bg-white/10'
                                        : 'border-white/30 hover:border-white/60'
                                }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept=".pdf"
                                    className="hidden"
                                    onChange={e => setUploadFile(e.target.files[0] || null)}
                                />
                                {uploadFile ? (
                                    <div className="space-y-1">
                                        <FileText size={20} className="text-white mx-auto" />
                                        <p className="text-xs text-white font-medium truncate">{uploadFile.name}</p>
                                        <button
                                            onClick={e => { e.stopPropagation(); setUploadFile(null); }}
                                            className="text-xs text-white/60 hover:text-white"
                                        >
                                            Changer
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <Upload size={20} className="text-white/60 mx-auto" />
                                        <p className="text-xs text-white/70">Déposer un PDF ou cliquer</p>
                                    </div>
                                )}
                            </div>

                            {/* Category selector */}
                            <select
                                value={uploadCategory}
                                onChange={e => setUploadCategory(e.target.value)}
                                className="w-full bg-white/20 text-white text-sm rounded-xl px-3 py-2 border border-white/30 focus:outline-none focus:ring-2 focus:ring-white/50"
                            >
                                {CATEGORIES.map(c => (
                                    <option key={c} value={c} className="text-gray-900 bg-white">{c}</option>
                                ))}
                            </select>

                            {/* Upload button */}
                            <button
                                onClick={handleUploadSubmit}
                                disabled={!uploadFile || uploading}
                                className="w-full bg-white text-[#FFB103] font-semibold text-sm rounded-xl py-2 disabled:opacity-50 hover:bg-amber-50 transition-colors flex items-center justify-center gap-2"
                            >
                                {uploading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-[#FFB103] border-t-transparent rounded-full animate-spin" />
                                        Indexation en cours…
                                    </>
                                ) : (
                                    <>
                                        <Upload size={15} />
                                        Uploader et indexer
                                    </>
                                )}
                            </button>

                            {uploadError && (
                                <p className="text-xs text-red-300 bg-red-900/20 px-3 py-2 rounded-lg">{uploadError}</p>
                            )}
                        </div>
                    )}

                    {/* Document list */}
                    <div className="flex-1 overflow-y-auto p-3">
                        {docsLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                        ) : docs.length === 0 ? (
                            <p className="text-center text-white/50 text-sm py-8">Aucun document indexé.</p>
                        ) : (
                            <div className="space-y-1">
                                {Object.entries(docsByCategory).map(([cat, catDocs]) => (
                                    <div key={cat}>
                                        <button
                                            onClick={() => toggleCat(cat)}
                                            className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs font-bold uppercase tracking-widest text-white/50 hover:text-white/80 transition-colors"
                                        >
                                            {expandedCats[cat] === false
                                                ? <ChevronRight size={12} />
                                                : <ChevronDown size={12} />
                                            }
                                            {cat} ({catDocs.length})
                                        </button>
                                        {expandedCats[cat] !== false && catDocs.map(doc => (
                                            <DocItem
                                                key={doc.id}
                                                doc={doc}
                                                isAdmin={isAdmin}
                                                onDelete={handleDeleteDoc}
                                                onView={handleViewDoc}
                                            />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </>

            {/* ── Chat panel ── */}
            <div className="flex-1 flex flex-col min-w-0">

                {/* Chat header */}
                <div className="bg-white rounded-2xl shadow-sm px-4 md:px-6 py-4 mb-4 flex items-center gap-3">
                    <button
                        onClick={() => setSidebarOpen(true)}
                        className="md:hidden p-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                        <FileText size={18} className="text-[#FFB103]" />
                    </button>
                    <div className="w-9 h-9 rounded-xl bg-[#FFB103] flex items-center justify-center flex-shrink-0">
                        <Bot size={18} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-base font-bold text-gray-900">Assistant IA</h1>
                        <p className="text-xs text-gray-400">{docs.length} document{docs.length !== 1 ? 's' : ''} · Stock temps réel activé</p>
                    </div>
                </div>

                {/* Messages area */}
                <div className="flex-1 bg-white rounded-2xl shadow-sm overflow-y-auto p-4 md:p-6 space-y-4">

                    {messages.length === 0 && !isTyping && (
                        <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
                            <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center">
                                <Bot size={32} className="text-[#FFB103]" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-gray-900 mb-1">Assistant Technique</h3>
                                <p className="text-sm text-gray-500 max-w-sm">
                                    Posez une question technique ou sur votre stock en temps réel. Je consulte les fiches techniques et les niveaux de stock actuels.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
                                {SUGGESTIONS.map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => handleSend(s)}
                                        className="text-left text-xs text-gray-600 bg-gray-50 hover:bg-amber-50 hover:text-[#FFB103] border border-gray-200 hover:border-amber-200 rounded-xl px-3 py-2.5 transition-colors"
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <MessageBubble
                            key={i}
                            message={msg}
                            onViewSource={handleViewSource}
                        />
                    ))}

                    {isTyping && <TypingIndicator />}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input area */}
                <div className="bg-white rounded-2xl shadow-sm mt-4 p-3 md:p-4">
                    <div className="flex gap-3 items-end">
                        <textarea
                            ref={textareaRef}
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Posez votre question technique… (Entrée pour envoyer)"
                            rows={1}
                            className="flex-1 resize-none border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB103] focus:border-transparent leading-relaxed"
                            style={{ minHeight: '48px', maxHeight: '120px' }}
                            onInput={e => {
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                            }}
                            disabled={isTyping}
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || isTyping}
                            className="w-12 h-12 bg-[#FFB103] text-[#1a1a1a] rounded-xl flex items-center justify-center disabled:opacity-40 hover:bg-[#d49400] transition-colors flex-shrink-0"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                    <p className="text-xs text-gray-400 mt-2 px-1">Entrée pour envoyer · Maj+Entrée pour nouvelle ligne</p>
                </div>
            </div>

            {/* ── Duplicate dialog ── */}
            {duplicateDoc && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center">
                                <AlertCircle size={20} className="text-amber-500" />
                            </div>
                            <h3 className="font-bold text-gray-900">Document existant</h3>
                        </div>
                        <p className="text-sm text-gray-600">
                            Un document nommé <strong>"{duplicateDoc}"</strong> existe déjà. Voulez-vous le remplacer par la nouvelle version ?
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => { setDuplicateDoc(null); setPendingUpload(null); }}
                                className="flex-1 border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleForceReplace}
                                disabled={uploading}
                                className="flex-1 bg-[#FFB103] text-[#1a1a1a] rounded-xl py-2.5 text-sm font-medium hover:bg-[#d49400] transition-colors disabled:opacity-50"
                            >
                                {uploading ? 'Remplacement…' : 'Remplacer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── PDF viewer modal ── */}
            {viewingPdf && (
                <div className="fixed inset-0 bg-black/70 z-50 flex flex-col">
                    <div className="bg-white flex items-center justify-between px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-3">
                            <FileText size={18} className="text-[#FFB103]" />
                            <span className="font-semibold text-gray-900 text-sm">{viewingPdf.name}</span>
                        </div>
                        <button
                            onClick={() => setViewingPdf(null)}
                            className="p-2 rounded-xl hover:bg-gray-100 transition-colors text-gray-500"
                        >
                            <X size={20} />
                        </button>
                    </div>
                    <iframe
                        src={`${API_BASE}/assistant_pdf.php?file=${encodeURIComponent(viewingPdf.file_path)}`}
                        className="flex-1 w-full"
                        title={viewingPdf.name}
                    />
                </div>
            )}
        </div>
    );
};

export default Assistant;
