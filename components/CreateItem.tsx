import React, { useState, useRef, useEffect } from 'react';
import { CardType, Tag, LearningItem } from '../types';
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

interface BatchImageDraft {
    id: string;
    url: string;
    title: string;
    back: string;
    annotations: Annotation[];
}

const TAG_COLORS = [
  'bg-slate-100 text-slate-800',
  'bg-red-100 text-red-800',
  'bg-orange-100 text-orange-800',
  'bg-amber-100 text-amber-800',
  'bg-green-100 text-green-800',
  'bg-emerald-100 text-emerald-800',
  'bg-teal-100 text-teal-800',
  'bg-cyan-100 text-cyan-800',
  'bg-blue-100 text-blue-800',
  'bg-indigo-100 text-indigo-800',
  'bg-violet-100 text-violet-800',
  'bg-purple-100 text-purple-800',
  'bg-fuchsia-100 text-fuchsia-800',
  'bg-pink-100 text-pink-800',
  'bg-rose-100 text-rose-800',
];

// Solid colors for annotations
const ANNOTATION_COLORS = [
  { class: 'bg-slate-900', border: 'border-slate-900', name: '黑色 (遮挡)' },
  { class: 'bg-red-600', border: 'border-red-600', name: '红色' },
  { class: 'bg-orange-500', border: 'border-orange-500', name: '橙色' },
  { class: 'bg-amber-400', border: 'border-amber-400', name: '黄色 (高亮)' },
  { class: 'bg-emerald-500', border: 'border-emerald-500', name: '绿色' },
  { class: 'bg-blue-600', border: 'border-blue-600', name: '蓝色' },
  { class: 'bg-indigo-600', border: 'border-indigo-600', name: '靛青' },
  { class: 'bg-white', border: 'border-slate-300', name: '白色 (擦除)' },
];

export const CreateItem: React.FC<CreateItemProps> = ({ onAddItem, availableTags = [] }) => {
  const [type, setType] = useState<CardType>(CardType.BASIC);
  const [title, setTitle] = useState('');
  const [front, setFront] = useState(''); 
  const [back, setBack] = useState('');   
  
  // Tag State
  const [tags, setTags] = useState<Tag[]>([{ id: 'default', name: '神经科学', color: 'bg-blue-100 text-blue-800' }]);
  const [tagInput, setTagInput] = useState('');
  const [selectedColor, setSelectedColor] = useState(TAG_COLORS[0]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  
  // Media & Annotation State
  const [mediaUrl, setMediaUrl] = useState<string | undefined>(undefined);
  const [annotations, setAnnotations] = useState<Annotation[]>([]);
  
  // Batch Mode State
  const [batchMode, setBatchMode] = useState<'none' | 'text' | 'image'>('none');
  const [batchText, setBatchText] = useState('');
  const [batchImageDrafts, setBatchImageDrafts] = useState<BatchImageDraft[]>([]);
  const [activeBatchImageId, setActiveBatchImageId] = useState<string | null>(null); // For annotation editing

  // Annotation Styling State
  const [annColor, setAnnColor] = useState(ANNOTATION_COLORS[0]);
  const [annOpacity, setAnnOpacity] = useState(1.0); // 0 to 1

  const [isDrawing, setIsDrawing] = useState(false);
  const [dragStart, setDragStart] = useState<{x: number, y: number} | null>(null);
  const [currentRect, setCurrentRect] = useState<Partial<Annotation> | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const batchImageInputRef = useRef<HTMLInputElement>(null);
  const frontInputRef = useRef<HTMLTextAreaElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  
  // Feedback State
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // --- Auto-Save / Draft Logic ---
  const DRAFT_KEY = 'cognicurve_draft_item';

  // Load draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const data = JSON.parse(savedDraft);
        if (data.type) setType(data.type);
        if (data.title) setTitle(data.title);
        if (data.front) setFront(data.front);
        if (data.back) setBack(data.back);
        if (data.mediaUrl) setMediaUrl(data.mediaUrl);
        if (data.annotations) setAnnotations(data.annotations);
        // Map simplified draft tags back to objects if possible, or use default color
        if (data.tags && Array.isArray(data.tags)) {
             const restoredTags: Tag[] = data.tags.map((t: any) => {
                 if (typeof t === 'string') return { id: `draft-${t}`, name: t, color: TAG_COLORS[0] };
                 return t;
             });
             setTags(restoredTags);
        }
        
        if (data.title || data.front) {
             setNotification({ type: 'info', message: '已恢复上次未保存的草稿' });
             setTimeout(() => setNotification(null), 3000);
        }
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
    }
  }, []);

  // Save draft on changes (Debounced)
  useEffect(() => {
    if (batchMode !== 'none') return; // Don't draft batch mode yet

    const handler = setTimeout(() => {
      const draftData = {
        type,
        title,
        front,
        back,
        mediaUrl,
        annotations,
        tags, 
        updatedAt: new Date().getTime()
      };
      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
        setLastSaved(new Date());
      } catch (e) {
        // Silently fail for drafts if quota full, will warn on actual save
        console.warn("Draft save failed (likely quota exceeded)");
      }
    }, 1000);

    return () => clearTimeout(handler);
  }, [type, title, front, back, tags, mediaUrl, annotations, batchMode]);


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
    
    setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + 2, start + 2); 
    }, 0);
  };

  const handleAddTag = (overrideName?: string, overrideColor?: string) => {
    const nameToAdd = overrideName || tagInput.trim();
    if (!nameToAdd) return;

    // Check if already added
    if (tags.some(t => t.name === nameToAdd)) {
        setTagInput('');
        setShowTagSuggestions(false);
        return;
    }

    // Check if exists in availableTags to reuse color/id
    const existingTag = availableTags.find(t => t.name === nameToAdd);
    
    const newTag: Tag = existingTag 
        ? existingTag 
        : {
            id: `tag-${Date.now()}-${Math.random()}`,
            name: nameToAdd,
            color: overrideColor || selectedColor
        };

    setTags([...tags, newTag]);
    setTagInput('');
    setShowTagSuggestions(false);
  };

  const handleRemoveTag = (tagId: string) => {
    setTags(tags.filter(t => t.id !== tagId));
  };

  // --- Image Handling (Single & Batch) ---

  const compressImage = (file: File, callback: (url: string) => void) => {
      if (file.size > 10 * 1024 * 1024) {
          showToast('error', `文件 ${file.name} 过大，请选择小于 10MB 的文件`);
          return;
      }
      const reader = new FileReader();
      reader.onload = (readerEvent) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const MAX_DIMENSION = 800;

            if (width > height) {
                if (width > MAX_DIMENSION) {
                    height *= MAX_DIMENSION / width;
                    width = MAX_DIMENSION;
                }
            } else {
                if (height > MAX_DIMENSION) {
                    width *= MAX_DIMENSION / height;
                    height = MAX_DIMENSION;
                }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6);
                callback(compressedDataUrl);
            }
        };
        if (readerEvent.target?.result) {
            img.src = readerEvent.target.result as string;
        }
      };
      reader.readAsDataURL(file);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        compressImage(file, (url) => {
            setMediaUrl(url);
            setAnnotations([]);
            showToast('success', "图片已压缩并上传");
        });
    }
  };

  const handleBatchImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;
      
      Array.from(files).forEach(file => {
          compressImage(file, (url) => {
              setBatchImageDrafts(prev => [...prev, {
                  id: `batch-img-${Date.now()}-${Math.random()}`,
                  url: url,
                  title: new Date().toLocaleString('zh-CN', {month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit'}) + ' 视觉笔记',
                  back: '',
                  annotations: []
              }]);
          });
      });
  };

  const triggerFileUpload = () => {
    fileInputRef.current?.click();
  };

  const removeImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMediaUrl(undefined);
    setAnnotations([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // --- Annotation Mouse Handlers ---
  const handleMouseDown = (e: React.MouseEvent) => {
    const container = imageContainerRef.current;
    if (!container) return;
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    
    // Calculate percentage coordinates
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    setDragStart({ x, y });
    setIsDrawing(true);
    // Label logic depends on context (single or batch active)
    const currentCount = activeBatchImageId 
        ? batchImageDrafts.find(b => b.id === activeBatchImageId)?.annotations.length || 0
        : annotations.length;

    setCurrentRect({ x, y, width: 0, height: 0, label: currentCount + 1 });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || !dragStart || !imageContainerRef.current) return;
    const rect = imageContainerRef.current.getBoundingClientRect();
    const currentX = ((e.clientX - rect.left) / rect.width) * 100;
    const currentY = ((e.clientY - rect.top) / rect.height) * 100;

    const width = Math.abs(currentX - dragStart.x);
    const height = Math.abs(currentY - dragStart.y);
    const x = currentX < dragStart.x ? currentX : dragStart.x;
    const y = currentY < dragStart.y ? currentY : dragStart.y;

    setCurrentRect({ 
        x: Math.max(0, Math.min(100 - width, x)), 
        y: Math.max(0, Math.min(100 - height, y)), 
        width: Math.min(100, width), 
        height: Math.min(100, height),
        label: currentRect?.label || 1,
    });
  };

  const handleMouseUp = () => {
    if (isDrawing && currentRect && currentRect.width && currentRect.width > 1 && currentRect.height && currentRect.height > 1) {
        const newAnn = { 
            ...currentRect as Annotation, 
            id: Date.now().toString(),
            color: annColor.class,
            opacity: annOpacity
        };

        if (activeBatchImageId) {
            // Update Batch Item
            setBatchImageDrafts(prev => prev.map(item => {
                if (item.id === activeBatchImageId) {
                    return { ...item, annotations: [...item.annotations, newAnn] };
                }
                return item;
            }));
        } else {
            // Single Item
            setAnnotations(prev => [...prev, newAnn]);
        }
    }
    setIsDrawing(false);
    setDragStart(null);
    setCurrentRect(null);
  };

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
      setNotification({ type, message });
      setTimeout(() => setNotification(null), 3000);
  };

  // --- Parse Text Batch ---
  const parseBatchText = (text: string) => {
      // Format: ## Title ## Content ## Title 2 ## Content 2
      const parts = text.split('##').map(s => s.trim()).filter(s => s);
      const items = [];
      for (let i = 0; i < parts.length; i += 2) {
          if (parts[i] && parts[i+1]) {
              items.push({ title: parts[i], content: parts[i+1] });
          }
      }
      return items;
  };

  const handleSaveBatch = () => {
      let itemsToSave: LearningItem[] = [];

      if (batchMode === 'text') {
          const parsed = parseBatchText(batchText);
          if (parsed.length === 0) {
              showToast('error', "未检测到有效内容，请检查格式 (## 标题 ## 内容)");
              return;
          }
          itemsToSave = parsed.map((p, idx) => ({
             id: Date.now().toString() + idx,
             type: CardType.BASIC,
             title: p.title,
             contentFront: p.title, // Usually front is the question/title
             contentBack: p.content,
             tags: tags,
             createdAt: new Date(),
             lastReviewedAt: null,
             nextReviewAt: new Date(),
             retentionScore: 0,
             reviewCount: 0,
             status: 'new',
             currentInterval: 0,
             stability: 1.0
          }));
      } else if (batchMode === 'image') {
          if (batchImageDrafts.length === 0) {
              showToast('error', "未选择图片");
              return;
          }
          itemsToSave = batchImageDrafts.map((d, idx) => {
              let finalExtraContext = undefined;
              if (d.annotations.length > 0) {
                  finalExtraContext = JSON.stringify({ visualAnnotations: d.annotations });
              }
              return {
                 id: Date.now().toString() + idx,
                 type: CardType.VISUAL,
                 title: d.title || '无标题图片',
                 contentFront: d.title || '视觉笔记',
                 contentBack: d.back, // Optional
                 mediaUrl: d.url,
                 extraContext: finalExtraContext,
                 tags: tags,
                 createdAt: new Date(),
                 lastReviewedAt: null,
                 nextReviewAt: new Date(),
                 retentionScore: 0,
                 reviewCount: 0,
                 status: 'new',
                 currentInterval: 0,
                 stability: 1.0
              };
          });
      }

      // Save All
      itemsToSave.forEach(item => onAddItem(item));
      showToast('success', `成功批量导入 ${itemsToSave.length} 个条目`);
      
      // Reset
      setBatchMode('none');
      setBatchText('');
      setBatchImageDrafts([]);
  };

  const handleSave = () => {
    if (!title.trim() || !front.trim()) {
        showToast('error', "请至少填写标题和正面内容");
        return;
    }

    // For Visual cards, we store annotations in extraContext as JSON
    let finalExtraContext = undefined;
    if (type === CardType.VISUAL && annotations.length > 0) {
        finalExtraContext = JSON.stringify({ visualAnnotations: annotations });
    }

    const newItem: LearningItem = {
      id: Date.now().toString(),
      type: type,
      title: title,
      contentFront: front,
      contentBack: back,
      mediaUrl: mediaUrl,
      extraContext: finalExtraContext,
      tags: tags, 
      createdAt: new Date(),
      lastReviewedAt: null,
      nextReviewAt: new Date(),
      retentionScore: 0,
      reviewCount: 0,
      status: 'new',
      currentInterval: 0,
      stability: 1.0
    };

    try {
        onAddItem(newItem);
        showToast('success', "条目已保存至知识库");
        
        // Clear draft
        localStorage.removeItem(DRAFT_KEY);
        
        // Reset form
        setTimeout(() => {
            setTitle('');
            setFront('');
            setBack('');
            setMediaUrl(undefined);
            setAnnotations([]);
            setTags([{ id: 'default', name: '神经科学', color: 'bg-blue-100 text-blue-800' }]);
        }, 500); 
    } catch (e) {
        console.error(e);
        showToast('error', "保存失败：存储空间已满");
    }
  };

  // Filter suggestions
  const filteredSuggestions = availableTags.filter(t => 
    t.name.toLowerCase().includes(tagInput.toLowerCase()) && 
    !tags.some(selected => selected.name === t.name)
  );

  // --- Sub-components for Rendering ---

  const renderAnnotationToolbar = () => (
      <div className="flex flex-col gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl mb-3">
        <div className="flex justify-between items-center">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <MousePointer2 size={16} /> 标注工具栏
            </label>
            <div className="flex gap-2">
                    <button 
                    onClick={() => {
                        if (activeBatchImageId) {
                            setBatchImageDrafts(prev => prev.map(i => i.id === activeBatchImageId ? {...i, annotations: i.annotations.slice(0, -1)} : i));
                        } else {
                            setAnnotations(prev => prev.slice(0, -1));
                        }
                    }}
                    className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1.5 rounded-lg flex items-center gap-1 hover:bg-slate-50"
                    >
                    <Undo2 size={12} /> 撤销
                    </button>
                    <button 
                    onClick={() => {
                        if (activeBatchImageId) {
                            setBatchImageDrafts(prev => prev.map(i => i.id === activeBatchImageId ? {...i, annotations: []} : i));
                        } else {
                            setAnnotations([]);
                        }
                    }}
                    className="text-xs bg-rose-50 border border-rose-100 text-rose-600 px-2 py-1.5 rounded-lg flex items-center gap-1 hover:bg-rose-100"
                    >
                    <Eraser size={12} /> 清除
                    </button>
            </div>
        </div>

        {/* Annotation Styling Controls */}
        <div className="flex flex-wrap items-center gap-4">
            {/* Color Picker */}
            <div className="flex items-center gap-1">
                {ANNOTATION_COLORS.map(c => (
                    <button
                        key={c.name}
                        onClick={() => setAnnColor(c)}
                        title={c.name}
                        className={`w-6 h-6 rounded-full border-2 ${c.class} ${
                            annColor.name === c.name 
                            ? 'border-slate-800 scale-110 shadow-sm' 
                            : 'border-transparent hover:scale-110'
                        }`}
                    />
                ))}
            </div>

            <div className="h-6 w-px bg-slate-300 hidden md:block"></div>

            {/* Opacity Slider */}
            <div className="flex items-center gap-2 flex-1">
                <span className="text-xs text-slate-500 font-medium whitespace-nowrap flex items-center gap-1">
                    {annOpacity === 1 ? <EyeOff size={14}/> : <Eye size={14}/>}
                    {annOpacity === 1 ? '遮挡' : '透明度'}
                </span>
                <input 
                    type="range" 
                    min="0.1" 
                    max="1" 
                    step="0.1" 
                    value={annOpacity}
                    onChange={(e) => setAnnOpacity(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-900"
                />
                <span className="text-xs text-slate-500 w-8 text-right">{Math.round(annOpacity * 100)}%</span>
            </div>
        </div>
    </div>
  );

  const renderSingleModeForm = () => {
    switch (type) {
      case CardType.CLOZE:
        return (
          <div className="space-y-4 animate-fade-in">
             <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-start gap-3 text-sm text-amber-800">
                <Sparkles size={16} className="mt-0.5 flex-shrink-0" />
                <p>在下方文本框中选中需要记忆的关键词，点击工具栏中的 <strong>[ ... ]</strong> 按钮生成挖空。</p>
             </div>
             <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <label className="block text-sm font-semibold text-slate-700">原文内容 (带挖空)</label>
                    <button 
                        onClick={insertCloze}
                        className="text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors flex items-center gap-2"
                        title="插入填空"
                    >
                        <EyeOff size={14} /> 挖空选中文字
                    </button>
                </div>
                <textarea 
                    ref={frontInputRef}
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none resize-none transition-all text-sm leading-relaxed font-mono"
                    placeholder="例如：线粒体是细胞的{{c1::能量工厂}}。"
                ></textarea>
            </div>
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">额外备注 (可选)</label>
                <input 
                    type="text"
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 outline-none text-sm bg-slate-50"
                    placeholder="作为提示显示在背面..."
                />
            </div>
          </div>
        );

      case CardType.VISUAL:
        return (
          <div className="space-y-4 animate-fade-in">
             <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
             />
             
             {!mediaUrl ? (
                <div 
                    onClick={triggerFileUpload}
                    className="border-2 border-dashed border-slate-200 rounded-2xl p-8 flex flex-col items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 hover:border-primary-300 transition-all cursor-pointer group h-64"
                >
                    <div className="p-4 bg-white rounded-full shadow-sm mb-3 group-hover:scale-110 transition-transform">
                        <Upload size={32} className="text-slate-300 group-hover:text-primary-500" />
                    </div>
                    <p className="text-sm font-medium">点击上传图片或拖拽至此</p>
                    <p className="text-xs mt-1 text-slate-400">支持 JPG, PNG (自动压缩)</p>
                </div>
             ) : (
                <div className="space-y-3">
                    {renderAnnotationToolbar()}

                    <div 
                        ref={imageContainerRef}
                        className="relative rounded-2xl overflow-hidden border border-slate-200 group bg-slate-900 select-none cursor-crosshair touch-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                        <img 
                            src={mediaUrl} 
                            alt="Visual note" 
                            className="w-full h-auto object-contain pointer-events-none select-none max-h-[500px]" 
                        />
                        
                        {/* Existing Annotations */}
                        {annotations.map((ann) => (
                            <div 
                                key={ann.id}
                                className={`absolute flex items-center justify-center pointer-events-none ${ann.color}`}
                                style={{ 
                                    left: `${ann.x}%`, 
                                    top: `${ann.y}%`, 
                                    width: `${ann.width}%`, 
                                    height: `${ann.height}%`,
                                    opacity: ann.opacity
                                }}
                            >
                                <span className="bg-slate-900 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm absolute -top-2 -left-2 font-bold z-10" style={{ opacity: 1 }}>
                                    {ann.label}
                                </span>
                            </div>
                        ))}

                        {/* Drawing Preview */}
                        {isDrawing && currentRect && (
                            <div 
                                className={`absolute ${annColor.class}`}
                                style={{ 
                                    left: `${currentRect.x}%`, 
                                    top: `${currentRect.y}%`, 
                                    width: `${currentRect.width}%`, 
                                    height: `${currentRect.height}%`,
                                    opacity: annOpacity
                                }}
                            />
                        )}

                        <div className="absolute top-3 right-3 flex gap-2">
                             <button onClick={removeImage} className="text-white text-xs bg-black/50 hover:bg-rose-600 px-3 py-1.5 rounded-lg backdrop-blur-sm transition-colors">
                                删除图片
                            </button>
                        </div>
                        
                        {annotations.length === 0 && !isDrawing && (
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="bg-black/40 text-white px-4 py-2 rounded-full text-xs backdrop-blur-sm flex items-center gap-2">
                                    <ScanLine size={14} /> 拖拽鼠标框选重点区域
                                </div>
                            </div>
                        )}
                    </div>
                </div>
             )}
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">考察问题</label>
                    <textarea 
                        value={front}
                        onChange={(e) => setFront(e.target.value)}
                        className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:border-primary-500 outline-none resize-none text-sm"
                        placeholder="例如：请解释图中区域 1 的功能是什么？"
                    ></textarea>
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">遮挡区域答案</label>
                    <textarea 
                        value={back}
                        onChange={(e) => setBack(e.target.value)}
                        className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:border-primary-500 outline-none resize-none text-sm bg-slate-50"
                        placeholder="被遮挡部分的详细解释..."
                    ></textarea>
                </div>
             </div>
          </div>
        );

      case CardType.CASE:
        return (
          <div className="space-y-6 animate-fade-in">
            <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">核心问题 (Problem)</label>
                <textarea 
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    className="w-full h-32 p-4 rounded-xl border border-slate-200 focus:border-primary-500 outline-none resize-none text-sm leading-relaxed font-medium"
                    placeholder="描述需要解决的复杂问题或案例挑战..."
                ></textarea>
            </div>

            <div className="space-y-2">
                <label className="block text-sm font-semibold text-slate-700">详细解析 (Solution)</label>
                <textarea 
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:border-primary-500 outline-none resize-none text-sm leading-relaxed"
                    placeholder="包含推导过程、逻辑链条和最终结论..."
                ></textarea>
            </div>
          </div>
        );

      case CardType.BASIC:
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
            <div className="space-y-2">
                <div className="flex justify-between">
                    <label className="block text-sm font-semibold text-slate-700">正面 (问题)</label>
                </div>
                <textarea 
                    value={front}
                    onChange={(e) => setFront(e.target.value)}
                    className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none resize-none transition-all text-sm leading-relaxed"
                    placeholder="什么问题能触发这个记忆点？"
                ></textarea>
            </div>
            
            <div className="space-y-2">
                <div className="flex justify-between">
                     <label className="block text-sm font-semibold text-slate-700">背面 (答案)</label>
                     <button className="text-indigo-600 hover:text-indigo-700 text-xs font-medium flex items-center gap-1">
                        <Sparkles size={12} /> AI 润色
                    </button>
                </div>
                <textarea 
                    value={back}
                    onChange={(e) => setBack(e.target.value)}
                    className="w-full h-48 p-4 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none resize-none transition-all text-sm leading-relaxed bg-slate-50"
                    placeholder="详细的解释或答案..."
                ></textarea>
            </div>
          </div>
        );
    }
  };

  const renderBatchMode = () => {
      if (batchMode === 'none') return null;

      return (
          <div className="space-y-6 animate-fade-in">
              <div className="flex justify-center gap-4 mb-4">
                  <button 
                    onClick={() => setBatchMode('text')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        batchMode === 'text' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                      <FileText size={16} /> 文本批量
                  </button>
                  <button 
                    onClick={() => setBatchMode('image')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                        batchMode === 'image' ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white border-slate-200 text-slate-500'
                    }`}
                  >
                      <ImageIcon size={16} /> 图片批量
                  </button>
              </div>

              {batchMode === 'text' && (
                  <div className="space-y-4">
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm text-slate-600">
                          <p className="font-semibold mb-2">格式说明：</p>
                          <code className="bg-slate-200 px-2 py-1 rounded text-slate-800">## 标题 ## 内容</code>
                          <p className="mt-2 text-xs">示例：</p>
                          <p className="text-xs italic">## 苹果 ## 一种红色的水果 ## 香蕉 ## 一种黄色的水果</p>
                      </div>
                      <textarea 
                        value={batchText}
                        onChange={(e) => setBatchText(e.target.value)}
                        className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:border-primary-500 outline-none font-mono text-sm"
                        placeholder="在此粘贴文本..."
                      />
                      {batchText && (
                          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">预览 ({parseBatchText(batchText).length} 项)</h4>
                              <div className="space-y-2 max-h-40 overflow-y-auto">
                                  {parseBatchText(batchText).map((item, i) => (
                                      <div key={i} className="flex gap-2 text-xs border-b border-slate-50 pb-1 last:border-0">
                                          <span className="font-bold text-slate-700 whitespace-nowrap">{item.title}</span>
                                          <span className="text-slate-500 truncate">{item.content}</span>
                                      </div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              )}

              {batchMode === 'image' && (
                  <div className="space-y-6">
                      <input 
                        type="file" 
                        ref={batchImageInputRef} 
                        className="hidden" 
                        accept="image/*" 
                        multiple
                        onChange={handleBatchImageUpload} 
                    />
                    <div 
                        onClick={() => batchImageInputRef.current?.click()}
                        className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                    >
                        <Plus size={24} className="mb-2" />
                        <p className="text-sm">点击选择多张图片</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {batchImageDrafts.map((draft, idx) => (
                            <div key={draft.id} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col gap-3">
                                <div className="relative group">
                                     <img src={draft.url} className="w-full h-32 object-cover rounded-lg bg-slate-100" />
                                     <button 
                                        onClick={() => setActiveBatchImageId(draft.id)}
                                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-medium gap-2"
                                     >
                                         <MousePointer2 size={16} /> {draft.annotations.length > 0 ? '编辑标注' : '添加标注'}
                                     </button>
                                     <button 
                                        onClick={() => setBatchImageDrafts(prev => prev.filter(p => p.id !== draft.id))}
                                        className="absolute top-2 right-2 p-1 bg-white rounded-full text-rose-500 shadow-sm opacity-0 group-hover:opacity-100 hover:bg-rose-50"
                                     >
                                         <X size={14} />
                                     </button>
                                </div>
                                <input 
                                    type="text" 
                                    value={draft.title}
                                    onChange={(e) => setBatchImageDrafts(prev => prev.map(p => p.id === draft.id ? {...p, title: e.target.value} : p))}
                                    className="text-sm font-bold border-b border-transparent focus:border-primary-300 outline-none pb-1"
                                    placeholder="标题"
                                />
                                <input 
                                    type="text" 
                                    value={draft.back}
                                    onChange={(e) => setBatchImageDrafts(prev => prev.map(p => p.id === draft.id ? {...p, back: e.target.value} : p))}
                                    className="text-xs text-slate-500 border-b border-transparent focus:border-primary-300 outline-none pb-1"
                                    placeholder="备注 (可选)"
                                />
                                {draft.annotations.length > 0 && (
                                    <div className="flex gap-1">
                                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded flex items-center gap-1">
                                            <Layers size={10} /> {draft.annotations.length} 标注
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                  </div>
              )}
          </div>
      );
  };

  const getTypeIcon = (t: CardType) => {
      switch(t) {
          case CardType.BASIC: return <Type size={16} />;
          case CardType.CLOZE: return <Briefcase size={16} />; 
          case CardType.VISUAL: return <ImageIcon size={16} />;
          case CardType.CASE: return <FileText size={16} />;
          default: return <Type size={16} />;
      }
  };

  // --- Modal for Batch Annotation Editing ---
  const activeBatchDraft = activeBatchImageId ? batchImageDrafts.find(d => d.id === activeBatchImageId) : null;

  return (
    <div className="max-w-3xl mx-auto pb-24 md:pb-0 relative">
      
      {/* Robust Toast Notification */}
      {notification && (
        <div className="fixed top-6 right-6 z-50 animate-bounce-in">
            <div className={`px-6 py-3 rounded-full shadow-xl flex items-center gap-3 border ${
                notification.type === 'success' 
                  ? 'bg-emerald-600 text-white border-emerald-700' 
                  : notification.type === 'error'
                    ? 'bg-rose-600 text-white border-rose-700'
                    : 'bg-indigo-600 text-white border-indigo-700'
            }`}>
                {notification.type === 'success' && <CheckCircle2 size={20} />}
                {notification.type === 'error' && <AlertTriangle size={20} />}
                {notification.type === 'info' && <RefreshCw size={20} />}
                <span className="font-medium">{notification.message}</span>
                <button 
                  onClick={() => setNotification(null)}
                  className="ml-2 opacity-80 hover:opacity-100"
                >
                  <X size={14} />
                </button>
            </div>
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex flex-col">
            <h2 className="text-2xl font-bold text-slate-900">{batchMode !== 'none' ? '批量导入' : '创建新条目'}</h2>
            <div className="flex items-center gap-2 mt-1">
                {lastSaved && batchMode === 'none' && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                        <CheckCircle2 size={10} className="text-emerald-500" />
                        草稿已于 {lastSaved.toLocaleTimeString()} 自动保存
                    </p>
                )}
            </div>
        </div>
        <div className="flex gap-2">
            <button 
                onClick={() => setBatchMode(prev => prev === 'none' ? 'text' : 'none')}
                className={`p-2.5 rounded-xl border transition-colors ${
                    batchMode !== 'none' 
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-600' 
                    : 'bg-white border-slate-200 text-slate-400 hover:text-slate-600'
                }`}
                title="批量创建模式"
            >
                <ListPlus size={20} />
            </button>
            <button 
                onClick={batchMode !== 'none' ? handleSaveBatch : handleSave}
                className="flex items-center space-x-2 px-6 py-2.5 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/20 active:scale-95 transform"
            >
                <Save size={18} />
                <span>{batchMode !== 'none' ? '全部导入' : '保存条目'}</span>
            </button>
        </div>
      </div>

      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-slate-100 space-y-8">
        
        {batchMode === 'none' ? (
            <>
                {/* Single Mode: Type Selector */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-3">选择学习格式</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {Object.values(CardType).map((t) => (
                            <button
                                key={t}
                                onClick={() => setType(t)}
                                className={`py-3 px-3 rounded-xl text-sm font-medium border transition-all flex flex-col items-center justify-center gap-2 ${
                                    type === t 
                                    ? 'border-primary-500 bg-primary-50 text-primary-700 ring-1 ring-primary-500' 
                                    : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:bg-slate-50'
                                }`}
                            >
                                {getTypeIcon(t)}
                                {t}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Single Mode: Title Field */}
                <div>
                    <label className="block text-sm font-semibold text-slate-700 mb-2">标题 / 概念核心</label>
                    <input 
                        type="text" 
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder={type === CardType.CASE ? "例如：2型糖尿病并发症案例分析" : "例如：线粒体功能"}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-primary-500 focus:ring-2 focus:ring-primary-100 outline-none transition-all font-medium text-slate-800"
                    />
                </div>

                {/* Single Mode: Dynamic Fields */}
                {renderSingleModeForm()}
            </>
        ) : (
            renderBatchMode()
        )}

        {/* Tagging System Enhanced (Shared) */}
        <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">标签分类 (应用于所有)</label>
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                {/* Active Tags */}
                <div className="flex flex-wrap gap-2 mb-3">
                    {tags.map((tag, idx) => (
                        <span key={idx} className={`px-3 py-1 rounded-full text-xs font-medium border border-transparent shadow-sm flex items-center gap-1 group ${tag.color}`}>
                            {tag.name} 
                            <button onClick={() => handleRemoveTag(tag.id)} className="opacity-50 hover:opacity-100">
                                <X size={12} />
                            </button>
                        </span>
                    ))}
                    {tags.length === 0 && <span className="text-xs text-slate-400 py-1">暂无标签</span>}
                </div>

                {/* Input Area */}
                <div className="relative">
                    <div className="flex items-center gap-2 bg-white rounded-lg border border-slate-200 p-1 pl-3 focus-within:ring-2 focus-within:ring-primary-100 focus-within:border-primary-400 transition-all">
                        <input 
                            type="text"
                            value={tagInput}
                            onChange={(e) => {
                                setTagInput(e.target.value);
                                setShowTagSuggestions(true);
                            }}
                            onFocus={() => setShowTagSuggestions(true)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                            placeholder="输入标签名称 (如: 物理)..."
                            className="flex-1 bg-transparent text-sm outline-none text-slate-700 placeholder:text-slate-400"
                        />
                        <button 
                            onClick={() => handleAddTag()}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-colors"
                        >
                            <Plus size={16} />
                        </button>
                    </div>

                    {/* Auto-complete Suggestions */}
                    {showTagSuggestions && tagInput && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-20 overflow-hidden max-h-48 overflow-y-auto">
                            {filteredSuggestions.map(tag => (
                                <button
                                    key={tag.id}
                                    onClick={() => handleAddTag(tag.name, tag.color)}
                                    className="w-full text-left px-4 py-2 hover:bg-slate-50 flex items-center justify-between group"
                                >
                                    <span className="text-sm text-slate-700 font-medium">{tag.name}</span>
                                    <span className={`w-3 h-3 rounded-full ${tag.color.split(' ')[0]}`}></span>
                                </button>
                            ))}
                            {filteredSuggestions.length === 0 && (
                                <div className="px-4 py-2 text-xs text-slate-400">
                                    按回车创建新标签 "{tagInput}"
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Color Picker */}
                <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <Palette size={14} className="text-slate-400 flex-shrink-0" />
                    {TAG_COLORS.map(color => (
                        <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`w-5 h-5 rounded-full flex-shrink-0 transition-transform ${color.split(' ')[0]} ${
                                selectedColor === color ? 'ring-2 ring-slate-400 scale-110' : 'hover:scale-110 opacity-70 hover:opacity-100'
                            }`}
                            title="选择标签颜色"
                        />
                    ))}
                </div>
            </div>
        </div>
      </div>

      {/* --- Batch Annotation Modal Overlay --- */}
      {activeBatchImageId && activeBatchDraft && (
          <div className="fixed inset-0 z-50 bg-slate-900/95 flex flex-col p-4 animate-fade-in">
              <div className="flex justify-between items-center mb-4 text-white">
                  <div>
                    <h3 className="font-bold text-lg">编辑标注</h3>
                    <p className="text-xs text-slate-400">正在编辑: {activeBatchDraft.title}</p>
                  </div>
                  <button 
                    onClick={() => setActiveBatchImageId(null)}
                    className="px-4 py-2 bg-indigo-600 rounded-lg text-sm font-bold hover:bg-indigo-500 transition-colors"
                  >
                      完成编辑
                  </button>
              </div>
              
              <div className="flex-1 bg-slate-800 rounded-2xl overflow-hidden flex flex-col p-4">
                 {renderAnnotationToolbar()}
                 <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-slate-900 rounded-xl border border-slate-700">
                    <div 
                        ref={imageContainerRef}
                        className="relative inline-block select-none cursor-crosshair touch-none"
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUp}
                        onMouseLeave={handleMouseUp}
                    >
                         <img 
                            src={activeBatchDraft.url} 
                            className="max-h-[70vh] max-w-full object-contain pointer-events-none select-none" 
                        />
                        {/* Draft Annotations */}
                        {activeBatchDraft.annotations.map((ann) => (
                            <div 
                                key={ann.id}
                                className={`absolute flex items-center justify-center pointer-events-none ${ann.color}`}
                                style={{ 
                                    left: `${ann.x}%`, 
                                    top: `${ann.y}%`, 
                                    width: `${ann.width}%`, 
                                    height: `${ann.height}%`,
                                    opacity: ann.opacity
                                }}
                            >
                                <span className="bg-slate-900 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm absolute -top-2 -left-2 font-bold z-10" style={{ opacity: 1 }}>
                                    {ann.label}
                                </span>
                            </div>
                        ))}
                         {/* Drawing Preview */}
                        {isDrawing && currentRect && (
                            <div 
                                className={`absolute ${annColor.class}`}
                                style={{ 
                                    left: `${currentRect.x}%`, 
                                    top: `${currentRect.y}%`, 
                                    width: `${currentRect.width}%`, 
                                    height: `${currentRect.height}%`,
                                    opacity: annOpacity
                                }}
                            />
                        )}
                    </div>
                 </div>
              </div>
          </div>
      )}
        
        {/* Preview of Curve */}
        {batchMode === 'none' && (
            <div className="mt-6 bg-slate-50 p-6 rounded-2xl border border-slate-200/60">
                <div className="flex items-start gap-4">
                    <div className="p-3 bg-white rounded-full shadow-sm text-slate-400">
                        <Sparkles size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-slate-900">艾宾浩斯引擎预测</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-md">
                            {type === CardType.CASE 
                                ? '综合应用类题目包含复杂逻辑，建议初始复习间隔缩短为 6 小时。'
                                : '基于当前文本密度，建议首次复习间隔为 12 小时。'
                            }
                        </p>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};