import React, { useState, useRef, useMemo, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BlotFormatter from 'quill-blot-formatter';

// Import your Header component (Update the path if your Header is in a different folder)
import Header from "@/components/Header";

// Register Quill Modules
const Table = Quill.import('modules/table');

Quill.register({
  'modules/table': Table,
  'modules/blotFormatter': BlotFormatter
}, true);

// --- CONSTANTS FOR MULTI-TENANT & SERVICES ---
const SITES = ['Kyamme', 'Manhours On Hire', 'Tasked', 'Founders Counsel', 'Curated for founders'];
const SERVICE_TAGS = [
  "Accounting", 
  "Content Writing", 
  "Design", 
  "Development", 
  "Digital Marketing", 
  "Legal", 
  "Recruitment", 
  "Sales", 
  "Video Editing", 
  "Virtual Assistant", 
  "Others"
];

// --- FIXED SERVER URL LOGIC ---
const RAW_URL = import.meta.env.VITE_API_URL || 'https://api.manhoursonhire.com';
const SERVER_URL = RAW_URL.replace(/\/+$/, '');

const BlogEditor = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [previewMode, setPreviewMode] = useState('none'); 
  
  // --- Table Modal State ---
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);

  // --- Sidebar Accordion State ---
  const [openSidebarTab, setOpenSidebarTab] = useState('tags');

  // --- Multi-tenant & Tag States ---
  const [selectedSites, setSelectedSites] = useState([]); 
  const [selectedTags, setSelectedTags] = useState([]); 

  // --- Editor FAQ Accordion State ---
  const [openEditorFaqIndex, setOpenEditorFaqIndex] = useState(0);

  // --- Typography Settings ---
  const [fontSize] = useState('18px');
  const [lineHeight] = useState('1.7');
  const [letterSpacing] = useState('-0.01em');
  const [fontFamily] = useState("'Poppins', sans-serif");

  // --- Data States ---
  const [faqs, setFaqs] = useState([]);
  const [featuredImageFile, setFeaturedImageFile] = useState(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const quillRef = useRef(null);
  const navigate = useNavigate();

  // Converts standard hyphens to Non-Breaking Hyphens (Matches live site)
  const processContent = (html) => {
    return html.replace(/-/g, '&#8209;');
  };

  // --- Selection Handlers ---
  const toggleItem = (_list, setList, item) => {
    setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  // --- FAQ Handlers ---
  const addFAQ = () => {
    setFaqs([...faqs, { question: '', answer: '' }]);
    setOpenEditorFaqIndex(faqs.length); 
  };
  
  const removeFAQ = (index) => {
    setFaqs(faqs.filter((_, i) => i !== index));
    if (openEditorFaqIndex === index) {
      setOpenEditorFaqIndex(null);
    } else if (openEditorFaqIndex !== null && openEditorFaqIndex > index) {
      setOpenEditorFaqIndex(openEditorFaqIndex - 1);
    }
  };

  const updateFAQ = (index, field, value) => {
    const newFaqs = [...faqs];
    newFaqs[index][field] = value;
    setFaqs(newFaqs);
  };

  // --- Image Handlers ---
  const handleFeaturedImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFeaturedImageFile(file);
      setFeaturedImagePreview(URL.createObjectURL(file));
      setFeaturedImageUrl('');
      setOpenSidebarTab('cover');
    }
  };

  const uploadFeaturedImage = async (e) => {
    e.preventDefault(); 
    if (!featuredImageFile) return;
    try {
      setIsUploadingImage(true);
      const formData = new FormData();
      formData.append('file', featuredImageFile); 

      const uploadEndpoint = SERVER_URL.endsWith('/api') ? '/upload' : '/api/upload'; 
      const res = await axios.post(`${SERVER_URL}${uploadEndpoint}`, formData);

      setFeaturedImageUrl(res.data.url);
      alert('Cover image uploaded successfully!');
    } catch (err) { 
      alert('Upload failed.'); 
    } finally { 
      setIsUploadingImage(false); 
    }
  };

  const clearFeaturedImage = (e) => {
    e.preventDefault();
    setFeaturedImageFile(null);
    setFeaturedImagePreview(null);
    setFeaturedImageUrl('');
  };

  const imageHandler = () => {
    const input = document.createElement('input');
    input.setAttribute('type', 'file');
    input.setAttribute('accept', 'image/*');
    input.click();
    input.onchange = async () => {
      if (!input.files?.[0]) return;
      const formData = new FormData();
      formData.append('file', input.files[0]); 
      try {
        const uploadEndpoint = SERVER_URL.endsWith('/api') ? '/upload' : '/api/upload'; 
        const res = await axios.post(`${SERVER_URL}${uploadEndpoint}`, formData);

        const editor = quillRef.current?.getEditor();
        if (editor) {
          const range = editor.getSelection();
          editor.insertEmbed(range ? range.index : 0, 'image', res.data.url);
        }
      } catch (err) { alert('Editor image upload failed.'); }
    };
  };

  // --- Table Insertion & Management Logic ---
  const handleInsertTable = (e) => {
    e.preventDefault();
    const editor = quillRef.current?.getEditor();
    if (editor) {
      const tableModule = editor.getModule('table');
      tableModule.insertTable(tableRows, tableCols);
      setShowTableModal(false);
    }
  };

  const handleTableAction = (e, action) => {
    e.preventDefault(); // Prevents editor from losing focus
    const editor = quillRef.current?.getEditor();
    if (!editor) return;
    
    try {
        const tableModule = editor.getModule('table');
        if (action === 'delete') {
            tableModule.deleteTable();
            setShowTableModal(false);
        } else if (action === 'row') {
            tableModule.insertRowBelow();
        } else if (action === 'col') {
            tableModule.insertColumnRight();
        }
    } catch (err) {
        alert("Please click inside a table first to modify it.");
    }
  };

  // Memoized Quill Modules
  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ header: [1, 2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike', 'blockquote'],
        [{ color: [] }, { background: [] }],
        [{ list: 'ordered' }, { list: 'bullet' }],
        [{ align: [] }],
        ['table'], 
        ['link', 'image', 'video'],
        ['clean']
      ],
      handlers: { 
        image: imageHandler,
        table: function() {
            setShowTableModal(prev => !prev);
        }
      }
    },
    table: true,
    blotFormatter: {
        overlay: {
            style: {
                border: '2px solid #1A4484',
            }
        }
    } 
  }), []);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (featuredImageFile && !featuredImageUrl) {
      return alert('Please click "Confirm Upload" on your cover image before publishing.');
    }
    if (selectedSites.length === 0) {
        return alert('Please select at least one website to publish to.');
    }

    const publishEndpoint = SERVER_URL.endsWith('/api') ? '/blogs/' : '/api/blogs/';
    const payload = { 
      title, 
      content, 
      featuredImage: featuredImageUrl, 
      faqs, 
      targetWebsites: selectedSites,
      tags: selectedTags, 
      styling: { fontSize, lineHeight, letterSpacing, fontFamily } 
    };

    try {
      await axios.post(`${SERVER_URL}${publishEndpoint}`, payload);
      navigate('/blogs');
    } catch (err) { alert('Error publishing.'); }
  };

  return (
    <div className="relative min-h-screen font-sans text-slate-900 selection:bg-[#FFED00] selection:text-black pb-20 bg-slate-50 overflow-x-clip">
      
      {/* Subtle Premium Background Pattern */}
      <div className="fixed inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '32px 32px' }} 
      />
      
      {/* Soft Glow Effects */}
      <div className="fixed top-[-10%] left-[-5%] w-[500px] h-[500px] bg-[#1A4484]/10 rounded-full blur-[100px] pointer-events-none z-0" />
      <div className="fixed bottom-[-10%] right-[-5%] w-[500px] h-[500px] bg-[#FFED00]/10 rounded-full blur-[100px] pointer-events-none z-0" />

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700;800;900&display=swap');
        
        /* ----------------------------------- */
        /* PREMIUM EDITOR STYLING (EDIT MODE)  */
        /* ----------------------------------- */
        .studio-editor .ql-container.ql-snow { border: none !important; font-family: ${fontFamily} !important; background: transparent; }
        
        .studio-editor .ql-toolbar.ql-snow { 
            border: none !important; 
            border-bottom: 1px solid rgba(226, 232, 240, 0.6) !important; 
            padding: 16px 32px !important; 
            position: sticky !important; 
            top: 16px !important; 
            background: rgba(255, 255, 255, 0.95) !important; 
            backdrop-filter: blur(12px); 
            z-index: 40 !important; 
            border-radius: 2rem 2rem 0 0; 
        }

        .studio-editor .ql-editor { padding: 40px !important; min-height: 500px; line-height: ${lineHeight}; letter-spacing: ${letterSpacing}; color: #1e293b; }
        .studio-editor .ql-editor ul { list-style-type: disc !important; padding-left: 1.5rem !important; }
        .studio-editor .ql-editor ol { list-style-type: decimal !important; padding-left: 1.5rem !important; }
        .studio-editor .ql-editor li { display: list-item !important; margin-bottom: 0.5em !important; }
        .studio-editor .ql-editor h1 { font-size: 2.5rem !important; font-weight: 900; letter-spacing: -0.04em; color: black; margin-bottom: 0.5em; }
        .studio-editor .ql-editor h2 { font-size: 2rem !important; font-weight: 800; margin-top: 1.5em; color: black; margin-bottom: 0.5em; }
        .studio-editor .ql-editor p { font-size: ${fontSize} !important; margin-bottom: 1.2em; }
        .studio-editor .ql-editor table { border-collapse: collapse; width: 100%; margin: 24px 0; border: none !important; table-layout: auto !important; }
        .studio-editor .ql-editor td, .studio-editor .ql-editor th { border: 1px solid #e2e8f0 !important; padding: 12px; background: transparent !important; min-width: 50px; position: relative; }

        /* ----------------------------------- */
        /* EXACT BLOG SINGLE STYLING (PREVIEW) */
        /* ----------------------------------- */
        .preview-content .ql-editor { 
          padding: 0 !important; 
          font-family: ${fontFamily} !important; 
          line-height: ${lineHeight}; 
          letter-spacing: ${letterSpacing}; 
          color: #1e293b; 
          overflow-y: visible;
          white-space: pre-wrap !important;
          word-break: break-word !important;
          overflow-wrap: break-word !important;
          hyphens: none !important;
        }
        .preview-content .ql-editor ul, .preview-content .ql-editor ol { padding-left: 2rem !important; margin-bottom: 1.2em !important; }
        .preview-content .ql-editor ul li { list-style-type: disc !important; display: list-item !important; list-style-position: outside !important; padding-left: 0 !important; margin-bottom: 0.5em !important; }
        .preview-content .ql-editor ol li { list-style-type: decimal !important; display: list-item !important; list-style-position: outside !important; padding-left: 0 !important; margin-bottom: 0.5em !important; }
        .preview-content .ql-editor li::before { display: none !important; }
        .preview-content .ql-editor h1 { font-size: 2.5rem !important; font-weight: 900; margin-bottom: 0.5em; margin-top: 1.5em; color: black; }
        .preview-content .ql-editor h2 { font-size: 2rem !important; font-weight: 800; margin-top: 1.5em; margin-bottom: 0.5em; color: black; }
        .preview-content .ql-editor h3 { font-size: 1.5rem !important; font-weight: 700; margin-top: 1.2em; margin-bottom: 0.5em; color: black; }
        .preview-content .ql-editor p { font-size: ${fontSize} !important; margin-bottom: 1.2em; }
        .preview-content .ql-editor img { border-radius: 12px; margin: 1.5rem 0; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); max-width: 100%; display: block; }
        .preview-content .ql-editor blockquote { border-left: 4px solid #1A4484; padding-left: 1.5rem; font-style: italic; margin: 1.5rem 0; }
        .preview-content .ql-editor table { border-collapse: collapse; width: 100%; margin: 24px 0; border: none !important; }
        .preview-content .ql-editor td, .preview-content .ql-editor th { border: 1px solid #e2e8f0 !important; padding: 16px; background: transparent !important; min-width: 100px; }
      `}</style>

      {/* Global Header */}
      <Header />

      {/* Clean Toolbar Row */}
      <div className="max-w-[1500px] mx-auto px-6 lg:px-10 pt-8 pb-2 flex justify-between items-center relative z-10">
        <div className="hidden md:flex bg-white shadow-sm p-1 rounded-xl border border-slate-200/60">
          {['none', 'desktop', 'mobile'].map((mode) => (
            <button 
              key={mode} 
              onClick={() => setPreviewMode(mode)} 
              className={`px-5 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${previewMode === mode ? 'bg-slate-100 text-[#1A4484] shadow-sm' : 'text-slate-400 hover:text-slate-800 hover:bg-slate-50'}`}
            >
              {mode === 'none' ? 'Editor' : mode}
            </button>
          ))}
        </div>

        <button 
          form="blog-form" 
          type="submit" 
          className="bg-[#1A4484] hover:bg-slate-900 text-white rounded-full text-xs font-black uppercase tracking-widest transition-all shadow-[0_4px_14px_0_rgba(26,68,132,0.39)] hover:shadow-[0_6px_20px_rgba(26,68,132,0.23)] px-8 py-3 relative z-10"
        >
          Publish Post
        </button>
      </div>

      <main className="max-w-[1500px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 p-6 lg:px-10 pb-10 relative z-10">
        
        {/* --- LEFT COLUMN: Editor OR PREVIEW --- */}
        <div className={`xl:col-span-8 space-y-8 ${previewMode !== 'none' ? 'xl:col-span-12 flex justify-center' : ''}`}>
          {previewMode === 'none' ? (
            <>
              {/* Main Editor */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-xl rounded-[2.5rem] overflow-visible relative group">

                  {/* --- CUSTOM INSERT & EDIT TABLE POPUP --- */}
                  <AnimatePresence>
                    {showTableModal && (
                      <motion.div 
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute top-[130px] left-1/2 -translate-x-1/2 z-[100] w-[320px] bg-white border border-slate-200 shadow-2xl rounded-2xl p-6"
                      >
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-bold text-slate-800">Table Settings</h4>
                            <button onClick={() => setShowTableModal(false)} className="text-slate-400 hover:text-[#1A4484] transition-colors">✕</button>
                        </div>
                        
                        {/* Insert New Table Section */}
                        <div className="flex gap-4 mb-4">
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Rows</label>
                                <input 
                                    type="number" min={1} max={20} 
                                    value={tableRows} 
                                    onChange={(e) => setTableRows(parseInt(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#1A4484] font-bold"
                                />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Columns</label>
                                <input 
                                    type="number" min={1} max={10} 
                                    value={tableCols} 
                                    onChange={(e) => setTableCols(parseInt(e.target.value))}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#1A4484] font-bold"
                                />
                            </div>
                        </div>
                        <button 
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={handleInsertTable}
                            className="w-full py-3 bg-[#1A4484] text-white rounded-xl font-bold text-sm shadow-lg shadow-[#1A4484]/20 hover:bg-slate-800 transition-colors mb-5"
                        >
                            Insert New Table
                        </button>

                        {/* Modify Existing Table Section */}
                        <div className="pt-4 border-t border-slate-100">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block text-center">Edit Current Table</label>
                            <div className="grid grid-cols-3 gap-2">
                                <button 
                                  onMouseDown={(e) => e.preventDefault()} 
                                  onClick={(e) => handleTableAction(e, 'row')} 
                                  className="py-2 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold hover:bg-slate-200 transition-colors"
                                >
                                  + Row
                                </button>
                                <button 
                                  onMouseDown={(e) => e.preventDefault()} 
                                  onClick={(e) => handleTableAction(e, 'col')} 
                                  className="py-2 bg-slate-100 text-slate-600 rounded-lg text-[11px] font-bold hover:bg-slate-200 transition-colors"
                                >
                                  + Col
                                </button>
                                <button 
                                  onMouseDown={(e) => e.preventDefault()} 
                                  onClick={(e) => handleTableAction(e, 'delete')} 
                                  className="py-2 bg-red-50 text-red-600 rounded-lg text-[11px] font-bold hover:bg-red-100 transition-colors"
                                >
                                  Delete
                                </button>
                            </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <form id="blog-form" onSubmit={handlePublish} className="flex flex-col relative pt-2">
                    <div className="px-10 pt-12 pb-4 relative z-10">
                      <textarea 
                        placeholder="Enter an engaging title..." 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        required 
                        rows={1}
                        className="w-full border-none shadow-none text-4xl lg:text-5xl font-black focus:outline-none focus:ring-0 resize-none p-0 bg-transparent overflow-hidden leading-tight text-slate-900 placeholder:text-slate-300"
                        onInput={(e) => {
                          const target = e.target;
                          target.style.height = 'auto';
                          target.style.height = target.scrollHeight + 'px';
                        }}
                      />
                    </div>
                    <div className="flex-1 studio-editor rounded-b-[2.5rem] relative z-10">
                      <ReactQuill ref={quillRef} theme="snow" placeholder="Start writing your amazing story..." value={content} onChange={setContent} modules={modules} />
                    </div>
                  </form>
                </div>
              </motion.div>

              {/* FAQ Section */}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15, ease: "easeOut" }}
              >
                <div className="bg-white/80 backdrop-blur-xl border border-slate-200/60 shadow-xl rounded-[2.5rem] relative overflow-hidden group">
                  
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 pt-10 px-10">
                    <div>
                      <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900">Structured FAQs</h3>
                      <p className="text-sm font-medium mt-1 text-slate-500">Boost SEO by adding relevant questions and answers.</p>
                    </div>
                    {faqs.length === 0 && (
                      <button type="button" onClick={addFAQ} className="mt-4 sm:mt-0 px-6 py-2.5 bg-black text-[#FFED00] border-none rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#1A4484] hover:text-white transition-colors shadow-md hover:shadow-lg">
                        + Add Question
                      </button>
                    )}
                  </div>
                  <div className="px-10 pb-10">
                    <div className="grid grid-cols-1 gap-5">
                      {faqs.length === 0 && (
                        <div className="py-14 border-2 border-dashed border-slate-200/80 rounded-[2rem] flex flex-col items-center justify-center text-slate-400 bg-white/50">
                          <span className="text-4xl mb-3">🤔</span>
                          <p className="font-semibold text-sm">No FAQs added yet. Click the button to start.</p>
                        </div>
                      )}
                      {faqs.map((faq, index) => {
                        const isOpen = openEditorFaqIndex === index;
                        return (
                          <motion.div 
                            key={index}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white/60 rounded-[1.5rem] border border-slate-200/60 relative group/faq transition-all hover:border-[#1A4484] hover:shadow-md hover:bg-white overflow-hidden"
                          >
                            <div 
                              className="p-6 cursor-pointer flex items-center justify-between"
                              onClick={() => setOpenEditorFaqIndex(isOpen ? null : index)}
                            >
                              <div className="font-bold text-slate-800 truncate pr-8 flex-1">
                                {faq.question || `Question ${index + 1}`}
                              </div>
                              <div className="flex items-center gap-4">
                                <span className={`transform transition-transform text-slate-400 font-bold ${isOpen ? 'rotate-180' : ''}`}>↓</span>
                                <button 
                                  type="button" 
                                  onClick={(e) => { e.stopPropagation(); removeFAQ(index); }} 
                                  className="h-8 w-8 flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-white hover:bg-[#1A4484] shadow-sm transition-colors"
                                >
                                  ✕
                                </button>
                              </div>
                            </div>
                            
                            <AnimatePresence>
                              {isOpen && (
                                <motion.div 
                                  initial={{ height: 0, opacity: 0 }} 
                                  animate={{ height: 'auto', opacity: 1 }} 
                                  exit={{ height: 0, opacity: 0 }}
                                >
                                  <div className="px-6 pb-6 pt-2">
                                    <label className="text-[10px] font-black text-[#1A4484] uppercase tracking-widest mb-3 block">Question {index + 1}</label>
                                    <input 
                                      placeholder="Question" 
                                      value={faq.question} 
                                      onChange={(e) => updateFAQ(index, 'question', e.target.value)} 
                                      className="w-full bg-white/80 border border-slate-200/60 font-bold focus:outline-none focus:ring-2 focus:ring-[#1A4484] mb-5 shadow-sm rounded-xl px-4 py-3 text-base transition-all" 
                                    />
                                    
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Answer</label>
                                    <textarea 
                                      placeholder="Answer" 
                                      value={faq.answer} 
                                      onChange={(e) => updateFAQ(index, 'answer', e.target.value)} 
                                      className="w-full bg-white/80 border border-slate-200/60 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1A4484] resize-y h-28 shadow-sm rounded-xl p-4 transition-all" 
                                    />
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </motion.div>
                        );
                      })}
                      {faqs.length > 0 && (
                        <div className="flex justify-center mt-4">
                          <button type="button" onClick={addFAQ} className="px-8 py-3 bg-black text-[#FFED00] border-none rounded-full text-xs font-black uppercase tracking-widest hover:bg-[#1A4484] hover:text-white transition-all shadow-md hover:shadow-lg">
                            + Add Question
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          ) : previewMode === 'mobile' ? (
              <div className="w-[390px] h-[844px] max-h-[80vh] shrink-0 mx-auto bg-white border-[14px] border-slate-900 rounded-[3rem] shadow-2xl relative overflow-hidden flex flex-col mt-4">
                {/* Mobile Notch Mockup */}
                <div className="absolute top-0 inset-x-0 h-7 bg-slate-900 rounded-b-3xl w-40 mx-auto z-20"></div>
                
                {/* Scrollable Mobile Container */}
                <div className="overflow-y-auto w-full h-full px-6 pt-14 pb-20 scrollbar-hide">
                  {featuredImagePreview && (
                    <div className="mb-6 rounded-xl overflow-hidden shadow-sm">
                      <img src={featuredImagePreview} alt="Cover" className="w-full h-auto object-cover" />
                    </div>
                  )}

                  <h1 className="font-black mb-8 text-3xl leading-[1.15] text-slate-900 tracking-tight" style={{ fontFamily }}>
                    {title || 'Untitled Post'}
                  </h1>

                  <div className="preview-content w-full max-w-none prose-sm">
                    <div className="ql-editor" dangerouslySetInnerHTML={{ __html: processContent(content) }} />
                  </div>

                  {faqs.length > 0 && (
                    <div className="pt-10 mt-6 border-t border-slate-100">
                      <h2 className="text-2xl font-semibold text-gray-900 mb-8 leading-tight tracking-tight">
                        Frequently Asked Questions
                      </h2>
                      <div className="flex flex-col gap-4">
                        {faqs.map((faq, index) => (
                          <div key={index} className="group w-full bg-white/60 border border-gray-200/60 shadow-sm rounded-2xl overflow-hidden">
                             <div className="w-full flex items-center justify-between p-5 text-left">
                               <span className="text-sm font-semibold text-gray-900">{faq.question}</span>
                               <div className="shrink-0 ml-3 w-8 h-8 rounded-lg flex items-center justify-center bg-[#1A4484]/10 text-[#1A4484] text-xs">
                                 ↓
                               </div>
                             </div>
                             <div className="px-5 pb-5">
                               <div className="pt-4 border-t border-gray-100 text-gray-600 text-sm leading-relaxed">
                                 {faq.answer}
                               </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
          ) : (
              /* DESKTOP PREVIEW WRAPPER - EXACTLY MATCHES LIVE max-w-7xl LAYOUT */
              <div className="w-full max-w-7xl mx-auto px-6 py-16 bg-white/80 rounded-[3rem] shadow-xl flex flex-col xl:flex-row gap-12 items-start mt-4">
                
                {/* LEFT COLUMN: Main Content */}
                <div className="flex-1 min-w-0 w-full py-8 pr-8 pl-0 sm:py-12 sm:pr-12 sm:pl-0 md:py-20 md:pr-20 md:pl-0">
                  {featuredImagePreview && (
                    <div className="mb-10 rounded-2xl overflow-hidden shadow-sm">
                      <img src={featuredImagePreview} alt="Cover" className="w-full h-auto object-cover max-h-[500px]" />
                    </div>
                  )}

                  <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-12 leading-[1.1] text-slate-900 tracking-tight" style={{ fontFamily }}>
                    {title || 'Untitled Post'}
                  </h1>

                  <div className="preview-content w-full max-w-none">
                    <div className="ql-editor" dangerouslySetInnerHTML={{ __html: processContent(content) }} />
                  </div>

                  {faqs.length > 0 && (
                    <div className="pt-16 mt-12 border-t border-slate-100">
                      <div className="mb-12">
                        <h2 className="text-[32px] md:text-[52px] font-semibold text-gray-900 leading-[1.3] tracking-tight">
                          Frequently Asked Questions
                        </h2>
                      </div>

                      <div className="flex flex-col gap-4">
                        {faqs.map((faq, index) => (
                          <div key={index} className="group w-full bg-white/60 backdrop-blur-md border border-gray-200/60 shadow-sm rounded-[1.8rem] overflow-hidden transition-all duration-500">
                             <div className="w-full flex items-center justify-between p-7 text-left">
                               <span className="text-base md:text-lg font-semibold text-gray-900">
                                 {faq.question}
                               </span>
                               <div className="shrink-0 ml-4 w-10 h-10 rounded-xl flex items-center justify-center bg-[#1A4484]/10 text-[#1A4484]">
                                 ↓
                               </div>
                             </div>
                             <div className="px-7 pb-7">
                               <div className="pt-5 border-t border-gray-100 text-gray-600 text-sm md:text-base leading-relaxed">
                                 {faq.answer}
                               </div>
                             </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Fake Sidebar Placeholder to Force Layout Alignment */}
                <div className="hidden xl:flex w-[400px] shrink-0 sticky top-24 h-[500px] border-2 border-dashed border-slate-300 rounded-[2.5rem] bg-slate-50/50 flex-col items-center justify-center p-8 text-center text-slate-500">
                    <span className="text-5xl mb-4">📐</span>
                    <h4 className="font-black text-xl mb-2 text-slate-700">Sidebar Placeholder</h4>
                    <p className="text-sm">This 400px space reserves the exact width used by the actual sidebar, ensuring your content preview is visually 1:1 with the live desktop view.</p>
                </div>
              </div>
          )}
        </div>

        {/* --- RIGHT COLUMN: SETTINGS SIDEBAR (Hidden in Preview Mode) --- */}
        {previewMode === 'none' && (
          <aside className="xl:col-span-4 space-y-6">
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                className="space-y-6 w-full"
            >
              
              {/* --- SERVICE TAGS ACCORDION --- */}
              <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden relative">
                <button 
                  type="button"
                  onClick={() => setOpenSidebarTab(openSidebarTab === 'tags' ? null : 'tags')}
                  className="w-full flex items-center justify-between px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-800"
                >
                  Service Tags
                  <span className={`transform transition-transform text-slate-400 font-bold ${openSidebarTab === 'tags' ? 'rotate-180' : ''}`}>↓</span>
                </button>
                <AnimatePresence>
                  {openSidebarTab === 'tags' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-8 pb-8 space-y-3">
                        {SERVICE_TAGS.map(tag => (
                          <label key={tag} className="flex items-center gap-3 cursor-pointer group">
                            <input 
                              type="checkbox" 
                              checked={selectedTags.includes(tag)} 
                              onChange={() => toggleItem(selectedTags, setSelectedTags, tag)}
                              className="w-5 h-5 rounded border-slate-300 text-[#1A4484] focus:ring-[#1A4484]" 
                            />
                            <span className={`text-sm font-bold transition-colors ${selectedTags.includes(tag) ? 'text-[#1A4484]' : 'text-slate-500'}`}>{tag}</span>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* --- TARGET WEBSITES ACCORDION --- */}
              <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden relative">
                <button 
                  type="button"
                  onClick={() => setOpenSidebarTab(openSidebarTab === 'sites' ? null : 'sites')}
                  className="w-full flex items-center justify-between px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-800"
                >
                  Publish To:
                  <span className={`transform transition-transform text-slate-400 font-bold ${openSidebarTab === 'sites' ? 'rotate-180' : ''}`}>↓</span>
                </button>
                <AnimatePresence>
                  {openSidebarTab === 'sites' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-8 pb-8 space-y-3">
                        {SITES.map(site => (
                          <label key={site} className="flex items-center gap-3 cursor-pointer">
                            <input 
                              type="checkbox" 
                              checked={selectedSites.includes(site)} 
                              onChange={() => toggleItem(selectedSites, setSelectedSites, site)}
                              className="w-5 h-5 rounded border-slate-300 text-[#1A4484] focus:ring-[#1A4484]" 
                            />
                            <span className={`text-sm font-bold transition-colors ${selectedSites.includes(site) ? 'text-[#1A4484]' : 'text-slate-500'}`}>{site}</span>
                          </label>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* COVER IMAGE ACCORDION */}
              <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden group relative">
                <button 
                  type="button"
                  onClick={() => setOpenSidebarTab(openSidebarTab === 'cover' ? null : 'cover')}
                  className="w-full flex items-center justify-between px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-800"
                >
                  Cover Image
                  <span className={`transform transition-transform text-slate-400 font-bold ${openSidebarTab === 'cover' ? 'rotate-180' : ''}`}>↓</span>
                </button>

                <AnimatePresence>
                  {openSidebarTab === 'cover' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-8 pb-8 pt-2">
                        {!featuredImagePreview ? (
                          <div className="relative h-48 border-2 border-dashed border-slate-300 rounded-[1.5rem] flex flex-col items-center justify-center bg-white/50 cursor-pointer">
                            <input type="file" onChange={handleFeaturedImageSelect} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" />
                            <span className="text-sm font-bold text-slate-700">Click to upload cover</span>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <img src={featuredImagePreview} className="w-full h-48 object-cover rounded-[1.5rem]" alt="Preview" />
                            {!featuredImageUrl && (
                              <button onClick={uploadFeaturedImage} type="button" className="w-full py-3.5 bg-yellow-400 font-bold rounded-xl text-xs uppercase tracking-widest text-slate-900 hover:bg-[#FFED00]">
                                  {isUploadingImage ? 'Uploading...' : 'Confirm Upload'}
                              </button>
                            )}
                            <button onClick={clearFeaturedImage} type="button" className="w-full py-3.5 bg-slate-100 font-bold rounded-xl text-xs uppercase tracking-widest hover:bg-slate-200">Remove</button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

            </motion.div>
          </aside>
        )}
      </main>
    </div>
  );
};

export default BlogEditor;