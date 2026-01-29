import React, { useState, useRef, useEffect } from 'react';
import { CardType, Tag, LearningItem, FSRSState } from '../types';
import { Save, Image as ImageIcon, Sparkles, Plus, X, Type, FileText, EyeOff, Briefcase, CheckCircle2, Upload, AlertTriangle, RefreshCw, Palette, MousePointer2, Eraser, Undo2, ScanLine, Eye, Layers, ListPlus, Files, Maximize } from 'lucide-react';

interface CreateItemProps {
  onAddItem: (item: LearningItem) => void;
  availableTags?: Tag[];
}

interface Annotation {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: number;
  color: string;
  opacity: number;
}

const TAG_COLORS = [
  'bg-slate-100 text-slate-800', 'bg-red-100 text-red-800', 'bg-orange-100 text-orange-800', 'bg-amber-100 text-amber-800',
  'bg-green-100 text-green-800', 'bg-emerald-100 text-emerald-800', 'bg-blue-100 text-blue-800', 'bg-indigo-100 text-indigo-800',
];

const ANNOTATION_COLORS = [
  { class: 'bg-slate-900', border: 'border-slate-900', name: '黑色 (遮挡)' },
  { class: 'bg-red-600', border: 'border-red-600', name: '红色' },
  { class: 'bg-amber-400', border: 'border-amber-400', name: '黄色 (高亮)' },
];

export const CreateItem: React.FC<CreateItemProps> = ({ onAddItem, availableTags = [] }) => {
  const [type, setType] = useState<CardType>(CardType.BASIC);
  const [title, setTitle] = useState('');
  const [front, setFront] = useState(''); 
  const [back, setBack] = useState('');   
  
  const [tags, setTags] = useState<Tag[]>([{ id: 'default', name: '神经科学', color: 'bg-blue-100 text-blue-800' }]);
  const [tagInput, setTagInput] = useState('');
  
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  
  const [annColor, setAnnColor] = useState(ANNOTATION_COLORS[0]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [currentRect, setCurrentRect] = useState<Partial<Annotation> | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLTextAreaElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 3000);
  };

  const insertCloze = () => {
    const textarea = frontInputRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = textarea.value;
    const selectedText = text.substring(start, end);
    if (selectedText.length === 0) return;
    const newText = text.substring(0, start) + `{{c1::${selectedText}}}` + text.substring(end);
    setFront(newText);
  };

  const handleAddTag = (overrideName?: string) => {
    const nameToAdd = overrideName || tagInput.trim();
    if (!nameToAdd || tags.some(t => t.name === nameToAdd)) return;
    setTags([...tags, { id: `tag-${Date.now()}`, name: nameToAdd, color: TAG_COLORS[0] }]);
    setTagInput('');
  };

  // --- Image Handling Optimization (Electron FS) ---

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        // Compress first (Client side optimization)
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_DIM = 1200;
                if (width > height && width > MAX_DIM) { height *= MAX_DIM/width; width = MAX_DIM; }
                else if (height > MAX_DIM) { width *= MAX_DIM/height; height = MAX_DIM; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                
                // CRITICAL: Offload to Electron FS if available
                if (window.electronAPI) {
                    try {
                        const savedPath = await window.electronAPI.saveImage(dataUrl);
                        setMediaUrl(savedPath); // Uses local-resource://...
                        showToast('success', '图片已安全保存至本地文件系统');
                    } catch (err) {
                        console.error(err);
                        showToast('error', '保存图片文件失败');
                    }
                } else {
                    // Fallback for Web
                    setMediaUrl(dataUrl);
                    showToast('info', 'Web模式：图片存储在本地缓存 (Base64)');
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    if (!title.trim() || !front.trim()) { showToast('error', "请至少填写标题和正面内容"); return; }

    let finalExtraContext = undefined;
    if (type === CardType.VISUAL && annotations.length > 0) {
        finalExtraContext = JSON.stringify({ visualAnnotations: annotations });
    }

    const newItem: LearningItem = {
      id: Date.now().toString(),
      type, title, contentFront: front, contentBack: back, mediaUrl, extraContext: finalExtraContext, tags, 
      createdAt: new Date(), lastReviewedAt: null, nextReviewAt: new Date(), retentionScore: 0, reviewCount: 0, status: 'new', 
      currentInterval: 0, 
      stability: 0, // FSRS Init
      fsrsDifficulty: 0, // Will be set on first review
      fsrsState: FSRSState.New
    };

    onAddItem(newItem);
    showToast('success', "条目已保存");
    setTitle(''); setFront(''); setBack(''); setMediaUrl(undefined); setAnnotations([]);
  };

  // Drawing Logic
  const handleMouseDown = (e: React.MouseEvent) => {
    if(!imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    setDragStart({ x: ((e.clientX - rect.left)/rect.width)*100, y: ((e.clientY - rect.top)/rect.height)*100 });
    setIsDrawing(true);
    setCurrentRect({ x:0, y:0, width:0, height:0 });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if(!isDrawing || !dragStart || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const curX = ((e.clientX - rect.left)/rect.width)*100;
    const curY = ((e.clientY - rect.top)/rect.height)*100;
    setCurrentRect({
        x: Math.min(curX, dragStart.x), y: Math.min(curY, dragStart.y),
        width: Math.abs(curX - dragStart.x), height: Math.abs(curY - dragStart.y),
        label: annotations.length + 1
    });
  };
  const handleMouseUp = () => {
    if(currentRect && currentRect.width && currentRect.width > 1) {
        setAnnotations([...annotations, { ...currentRect as Annotation, id: Date.now().toString(), color: annColor.class, opacity: 1 }]);
    }
    setIsDrawing(false); setCurrentRect(null);
  };

  return (
    <div className="max-w-3xl mx-auto pb-24 md:pb-0 relative">
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-3 rounded-full shadow-xl text-white ${notification.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'}`}>
            {notification.message}
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-slate-900">创建新条目</h2>
        <button onClick={handleSave} className="flex items-center space-x-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 shadow-lg">
            <Save size={18} /> <span>保存条目</span>
        </button>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-6">
         <div className="grid grid-cols-4 gap-2">
            {Object.values(CardType).map((t) => (
                <button key={t} onClick={() => setType(t)} className={`py-3 rounded-xl text-sm font-medium border ${type === t ? 'border-primary-500 bg-primary-50 text-primary-700' : 'border-slate-200'}`}>{t}</button>
            ))}
         </div>

         <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="标题 / 核心概念" className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 outline-none font-medium" />

         {/* Type Specific Fields */}
         {type === CardType.CLOZE && (
             <div className="space-y-4">
                 <div className="flex justify-between"><label>原文</label><button onClick={insertCloze} className="text-xs bg-slate-100 px-2 py-1 rounded">挖空选中</button></div>
                 <textarea ref={frontInputRef} value={front} onChange={e => setFront(e.target.value)} className="w-full h-32 p-3 border rounded-xl" placeholder="选中文字点击挖空..." />
                 <input type="text" value={back} onChange={e => setBack(e.target.value)} placeholder="备注 (可选)" className="w-full p-3 border rounded-xl" />
             </div>
         )}

         {type === CardType.VISUAL && (
             <div className="space-y-4">
                 <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
                 {!mediaUrl ? (
                     <div onClick={() => fileInputRef.current?.click()} className="h-48 border-2 border-dashed rounded-xl flex items-center justify-center cursor-pointer hover:bg-slate-50">
                         <div className="text-center text-slate-400"><Upload className="mx-auto mb-2"/>上传图片</div>
                     </div>
                 ) : (
                     <div className="relative border rounded-xl overflow-hidden bg-slate-900" 
                        ref={imageContainerRef} onMouseDown={handleMouseDown} onMouseMove={handleMouseMove} onMouseUp={handleMouseUp}
                     >
                         <img src={mediaUrl} className="w-full h-auto object-contain select-none pointer-events-none" />
                         {annotations.map(a => <div key={a.id} className={`absolute flex items-center justify-center text-white text-xs ${a.color}`} style={{left:`${a.x}%`, top:`${a.y}%`, width:`${a.width}%`, height:`${a.height}%`}}>{a.label}</div>)}
                         {currentRect && <div className={`absolute border-2 border-white ${annColor.class} opacity-50`} style={{left:`${currentRect.x}%`, top:`${currentRect.y}%`, width:`${currentRect.width}%`, height:`${currentRect.height}%`}} />}
                         <button onClick={() => {setMediaUrl(undefined); setAnnotations([]);}} className="absolute top-2 right-2 bg-red-600 text-white p-1 rounded">删除</button>
                     </div>
                 )}
                 <div className="flex gap-2">
                     {ANNOTATION_COLORS.map(c => <button key={c.name} onClick={() => setAnnColor(c)} className={`w-6 h-6 rounded-full ${c.class} ${annColor.name===c.name?'ring-2 ring-offset-2':''}`} />)}
                 </div>
                 <textarea value={front} onChange={e => setFront(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="考察问题..." />
                 <textarea value={back} onChange={e => setBack(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="详细解析..." />
             </div>
         )}

         {(type === CardType.BASIC || type === CardType.CASE) && (
             <div className="grid md:grid-cols-2 gap-4">
                 <textarea value={front} onChange={e => setFront(e.target.value)} className="w-full h-40 p-3 border rounded-xl" placeholder="正面 / 问题" />
                 <textarea value={back} onChange={e => setBack(e.target.value)} className="w-full h-40 p-3 border rounded-xl" placeholder="背面 / 答案" />
             </div>
         )}

         {/* Tagging */}
         <div className="flex items-center gap-2">
             <input type="text" value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key==='Enter' && handleAddTag()} placeholder="添加标签..." className="px-3 py-2 border rounded-lg text-sm" />
             <button onClick={() => handleAddTag()} className="p-2 bg-slate-100 rounded-lg"><Plus size={16}/></button>
             <div className="flex flex-wrap gap-2">
                 {tags.map(t => <span key={t.id} className={`px-2 py-1 rounded text-xs ${t.color}`}>{t.name} <button onClick={() => setTags(tags.filter(tg=>tg.id!==t.id))}>&times;</button></span>)}
             </div>
         </div>
      </div>
    </div>
  );
};