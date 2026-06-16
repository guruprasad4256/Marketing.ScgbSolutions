import React, { useState, useRef, useMemo, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BlotFormatter from 'quill-blot-formatter';
import Header from "@/components/Header";

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

  // --- SEO States ---
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // --- Author States (Now pulling from API instead of Local Storage) ---
  const [authorsList, setAuthorsList] = useState([]);
  const [isAddingNewAuthor, setIsAddingNewAuthor] = useState(true);
  const [editingAuthorOriginalName, setEditingAuthorOriginalName] = useState(null);

  const [authorName, setAuthorName] = useState('');
  const [authorImage, setAuthorImage] = useState('');
  const [authorLink, setAuthorLink] = useState('');
  const [authorDescription, setAuthorDescription] = useState('');
  const [isUploadingAuthorImage, setIsUploadingAuthorImage] = useState(false);

  // --- Fetch Authors from Database on Load ---
  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const authorsEndpoint = `${SERVER_URL}/api/authors`;
        const res = await axios.get(authorsEndpoint);
        setAuthorsList(res.data);
        
        // If authors exist in DB, select the first one by default
        if (res.data.length > 0) {
          const firstAuthor = res.data[0];
          setAuthorName(firstAuthor.name);
          setAuthorImage(firstAuthor.image || '');
          setAuthorLink(firstAuthor.link || '');
          setAuthorDescription(firstAuthor.description || '');
          setIsAddingNewAuthor(false);
        }
      } catch (err) {
        console.error("Failed to fetch authors from database", err);
      }
    };
    fetchAuthors();
  }, []);

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

  // --- Author Logic Handlers ---
  const handleSelectAuthor = (author) => {
    setAuthorName(author.name);
    setAuthorImage(author.image || '');
    setAuthorLink(author.link || '');
    setAuthorDescription(author.description || '');
    setIsAddingNewAuthor(false);
    setEditingAuthorOriginalName(null);
  };

  const handleEditAuthor = (e, author) => {
    e.stopPropagation();
    setEditingAuthorOriginalName(author.name);
    setAuthorName(author.name);
    setAuthorImage(author.image || '');
    setAuthorLink(author.link || '');
    setAuthorDescription(author.description || '');
    setIsAddingNewAuthor(true);
  };

  const handleDeleteAuthor = async (e, authorNameToDelete) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to permanently delete ${authorNameToDelete} from the database?`)) return;
    
    try {
      // Correctly call the DELETE route by name
      await axios.delete(`${SERVER_URL}/api/authors/${encodeURIComponent(authorNameToDelete)}`);
      
      const updatedAuthors = authorsList.filter(a => a.name !== authorNameToDelete);
      setAuthorsList(updatedAuthors);
      
      if (authorName === authorNameToDelete) {
        if (updatedAuthors.length > 0) {
          handleSelectAuthor(updatedAuthors[0]);
        } else {
          setAuthorName('');
          setAuthorImage('');
          setAuthorLink('');
          setAuthorDescription('');
          setIsAddingNewAuthor(true);
          setEditingAuthorOriginalName(null);
        }
      }
      alert("Author deleted successfully.");
    } catch (err) {
      console.error("Error deleting author:", err);
      alert("Failed to delete author from database.");
    }
  };

  const handleSaveNewAuthor = async () => {
    if (!authorName.trim()) return alert("Author name is required");
    
    const newAuthorPayload = { 
      name: authorName.trim(), 
      image: authorImage || '', 
      link: authorLink || '',
      description: authorDescription || '' 
    };

    try {
      // POST to the dedicated author collection API (handles upsert)
      const res = await axios.post(`${SERVER_URL}/api/authors`, newAuthorPayload);
      const savedAuthor = res.data;

      // Update local list state
      setAuthorsList(prev => {
        const index = prev.findIndex(a => a.name.toLowerCase() === savedAuthor.name.toLowerCase());
        if (index !== -1) {
          // Replace existing entry
          const newList = [...prev];
          newList[index] = savedAuthor;
          return newList;
        }
        // Append new entry and sort
        return [...prev, savedAuthor].sort((a, b) => a.name.localeCompare(b.name));
      });

      setIsAddingNewAuthor(false);
      setEditingAuthorOriginalName(null);
      alert("Author details saved to database!");
    } catch (err) {
      console.error("Error saving author:", err);
      alert("Failed to save author to database.");
    }
  };

  const uploadAuthorImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAuthorImage(true);
      const formData = new FormData();
      formData.append('file', file); 

      const uploadEndpoint = SERVER_URL.endsWith('/api') ? '/upload' : '/api/upload'; 
      const res = await axios.post(`${SERVER_URL}${uploadEndpoint}`, formData);

      setAuthorImage(res.data.url);
    } catch (err) { 
      alert('Author image upload failed.'); 
    } finally { 
      setIsUploadingAuthorImage(false); 
    }
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

    if (!title.trim()) return alert("Please enter a title.");
    if (!content || content === '<p><br></p>') return alert("Please write some content.");
    if (!featuredImageUrl) {
        if (featuredImageFile) return alert('Please click "Confirm Upload" on your cover image first.');
        return alert('Featured image is required!');
    }
    if (selectedSites.length === 0) return alert('Please select at least one website.');
    if (!authorName.trim()) return alert('Author name is required!');

    const publishEndpoint = SERVER_URL.endsWith('/api') ? '/blogs' : '/api/blogs';
    
    // Explicitly construct the payload to ensure Author and SEO data are sent correctly
    const payload = { 
      title: title.trim(), 
      content: content, 
      featuredImage: featuredImageUrl, 
      faqs: faqs, 
      targetWebsites: selectedSites,
      tags: selectedTags, 
      categories: [], 
      styling: { fontSize, lineHeight, letterSpacing, fontFamily },
      author: {
        name: authorName.trim(),
        image: authorImage || '',
        link: authorLink || '',
        description: authorDescription || ''
      },
      metaTitle: metaTitle.trim() || '',
      metaDescription: metaDescription.trim() || ''
    };

    try {
      await axios.post(`${SERVER_URL}/api/authors`, {
        name: authorName.trim(),
        image: authorImage || '',
        link: authorLink || '',
        description: authorDescription || ''
      });

      const blogRes = await axios.post(`${SERVER_URL}${publishEndpoint}`, payload);
      const postedBlog = blogRes.data?.blog || blogRes.data;
      const postedSlug = postedBlog?.slug;

      alert('Blog Published Successfully!');

      const SITE_URLS = {
        "Tasked": "https://www.tasked.in",
        "Manhours On Hire": "https://manhoursonhire.com",
        "Curated for founders": "https://curatedforfounders.in",
        "Founders Counsel": "https://founderscounsel.co",
        "Kyamme": "https://kyamme.com"
      };

      const primarySite = selectedSites[0];
      const targetBaseUrl = SITE_URLS[primarySite];

      if (postedSlug && targetBaseUrl) {
        window.location.href = `${targetBaseUrl}/blogs/${postedSlug}`;
      } else if (postedSlug) {
        navigate(`/blogs/${postedSlug}`);
      } else {
        navigate('/blogs');
      }
    } catch (err) { 
      console.error("Publish Error:", err.response?.data);
      alert('Error publishing: ' + (err.response?.data?.error || err.message)); 
    }
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
        .studio-editor .ql-editor h1 { font-size: 2.5rem !important; font-weight: 900; letter-spacing: -0.04em; color: black; margin-bottom: 0.5em; }
        .studio-editor .ql-editor h2 { font-size: 2rem !important; font-weight: 800; margin-top: 1.5em; color: black; margin-bottom: 0.5em; }
        .studio-editor .ql-editor p { font-size: ${fontSize} !important; margin-bottom: 1.2em; }
        .studio-editor .ql-editor table { border-collapse: collapse; width: 100%; margin: 24px 0; border: none !important; table-layout: auto !important; }
        .studio-editor .ql-editor td, .studio-editor .ql-editor th { border: 1px solid #e2e8f0 !important; padding: 12px; background: transparent !important; min-width: 50px; position: relative; }

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
        .preview-content .ql-editor h1 { font-size: 2.5rem !important; font-weight: 900; margin-bottom: 0.5em; margin-top: 1.5em; color: black; }
        .preview-content .ql-editor p { font-size: ${fontSize} !important; margin-bottom: 1.2em; }
        
        .preview-content .ql-editor table { border-collapse: collapse; width: 100%; margin: 24px 0; border: none !important; table-layout: auto !important; }
        .preview-content .ql-editor td, .preview-content .ql-editor th { border: 1px solid #e2e8f0 !important; padding: 12px; background: transparent !important; min-width: 50px; position: relative; color: #1e293b !important; }
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
          ) : (
              <div className="w-full max-w-7xl mx-auto px-6 py-16 bg-white/80 rounded-[3rem] shadow-xl flex flex-col xl:flex-row gap-12 items-start mt-4">
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

                <div className="hidden xl:flex w-[400px] shrink-0 sticky top-24 h-[500px] border-2 border-dashed border-slate-300 rounded-[2.5rem] bg-slate-50/50 flex-col items-center justify-center p-8 text-center text-slate-500">
                    <span className="text-5xl mb-4">📐</span>
                    <h4 className="font-black text-xl mb-2 text-slate-700">Sidebar Placeholder</h4>
                    <p className="text-sm">Content preview matches the live desktop view.</p>
                </div>
              </div>
          )}
        </div>

        {/* --- RIGHT COLUMN: SETTINGS SIDEBAR --- */}
        {previewMode === 'none' && (
          <aside className="xl:col-span-4 space-y-6">
            <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
                className="space-y-6 w-full"
            >
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

              <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden group relative">
                <button 
                  type="button"
                  onClick={() => setOpenSidebarTab(openSidebarTab === 'cover' ? null : 'cover')}
                  className="w-full flex items-center justify-between px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-800"
                >
                  Cover Image & SEO
                  <span className={`transform transition-transform text-slate-400 font-bold ${openSidebarTab === 'cover' ? 'rotate-180' : ''}`}>↓</span>
                </button>

                <AnimatePresence>
                  {openSidebarTab === 'cover' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-8 pb-8 pt-2">
                        {!featuredImagePreview ? (
                          <div className="relative h-48 border-2 border-dashed border-slate-300 rounded-[1.5rem] flex flex-col items-center justify-center bg-white/50 cursor-pointer mb-6">
                            <input type="file" onChange={handleFeaturedImageSelect} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" />
                            <span className="text-sm font-bold text-slate-700">Click to upload cover</span>
                          </div>
                        ) : (
                          <div className="space-y-4 mb-6">
                            <img src={featuredImagePreview} className="w-full h-48 object-cover rounded-[1.5rem]" alt="Preview" />
                            {!featuredImageUrl && (
                              <button onClick={uploadFeaturedImage} type="button" className="w-full py-3.5 bg-yellow-400 font-bold rounded-xl text-xs uppercase tracking-widest text-slate-900 hover:bg-[#FFED00]">
                                  {isUploadingImage ? 'Uploading...' : 'Confirm Upload'}
                              </button>
                            )}
                            <button onClick={clearFeaturedImage} type="button" className="w-full py-3.5 bg-slate-100 font-bold rounded-xl text-xs uppercase hover:bg-slate-200">Remove Image</button>
                          </div>
                        )}

                        <div className="mt-6 pt-6 border-t border-slate-100 space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Meta Title</label>
                                <input 
                                    type="text" value={metaTitle} 
                                    onChange={(e) => setMetaTitle(e.target.value)}
                                    placeholder="SEO Title..."
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#1A4484] font-bold text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Meta Description</label>
                                <textarea 
                                    value={metaDescription} 
                                    onChange={(e) => setMetaDescription(e.target.value)}
                                    placeholder="SEO Description..."
                                    rows={3}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#1A4484] font-bold text-sm resize-none"
                                />
                            </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] border border-slate-200/60 shadow-sm overflow-hidden relative">
                <button 
                  type="button"
                  onClick={() => setOpenSidebarTab(openSidebarTab === 'author' ? null : 'author')}
                  className="w-full flex items-center justify-between px-8 py-6 text-xs font-black uppercase tracking-widest text-slate-800"
                >
                  Author Details
                  <span className={`transform transition-transform text-slate-400 font-bold ${openSidebarTab === 'author' ? 'rotate-180' : ''}`}>↓</span>
                </button>
                <AnimatePresence>
                  {openSidebarTab === 'author' && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="px-8 pb-8 space-y-4">
                        {authorsList.length > 0 && !isAddingNewAuthor ? (
                          <>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Select Author *</label>
                            <div className="grid grid-cols-1 gap-2 mb-4 max-h-48 overflow-y-auto pr-1">
                              {authorsList.map((author, idx) => (
                                <div 
                                  key={idx} 
                                  onClick={() => handleSelectAuthor(author)}
                                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${authorName === author.name ? 'border-[#1A4484] bg-blue-50/50 shadow-sm' : 'border-slate-200 hover:border-slate-300 bg-slate-50'}`}
                                >
                                  {author.image ? (
                                    <img src={author.image} alt={author.name} className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0" />
                                  ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0">
                                      {author.name.charAt(0).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="flex-1 truncate">
                                    <p className="text-sm font-bold text-slate-800 truncate">{author.name}</p>
                                  </div>
                                  <div className="flex items-center gap-1 shrink-0">
                                    {authorName === author.name && <span className="text-[#1A4484] text-lg font-bold mr-1">✓</span>}
                                    <button 
                                      type="button" 
                                      onClick={(e) => handleEditAuthor(e, author)}
                                      className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-[#1A4484] hover:text-white transition-colors"
                                    >✎</button>
                                    <button 
                                      type="button" 
                                      onClick={(e) => handleDeleteAuthor(e, author.name)}
                                      className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-colors"
                                    >✕</button>
                                  </div>
                                </div>
                              ))}
                            </div>
                            <button 
                              type="button" 
                              onClick={() => { setEditingAuthorOriginalName(null); setAuthorName(''); setAuthorImage(''); setAuthorLink(''); setAuthorDescription(''); setIsAddingNewAuthor(true); }}
                              className="w-full py-3 bg-slate-100 font-bold rounded-xl text-xs uppercase tracking-widest text-slate-600 hover:bg-slate-200 transition-colors"
                            >+ Add New Author</button>
                          </>
                        ) : (
                          <>
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Name *</label>
                              <input 
                                type="text" value={authorName} 
                                onChange={(e) => setAuthorName(e.target.value)}
                                placeholder="e.g. Jane Doe"
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#1A4484] font-bold text-sm"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Profile Image</label>
                              <div className="flex items-center gap-3">
                                {authorImage ? <img src={authorImage} alt="avatar" className="w-10 h-10 rounded-full object-cover shrink-0" /> : <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">IMG</div>}
                                <div className="relative flex-1 h-[42px]">
                                  <input type="file" onChange={uploadAuthorImage} className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full" accept="image/*" />
                                  <div className="absolute inset-0 flex items-center justify-center bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors">
                                    {isUploadingAuthorImage ? 'Uploading...' : (authorImage ? 'Change Image' : 'Upload Image')}
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Profile Link</label>
                              <input 
                                type="text" value={authorLink} 
                                onChange={(e) => setAuthorLink(e.target.value)}
                                placeholder="https://linkedin.com/in/..."
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#1A4484] font-bold text-sm"
                              />
                            </div>
                            <div>
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Author Description</label>
                              <textarea 
                                value={authorDescription} 
                                onChange={(e) => setAuthorDescription(e.target.value)}
                                placeholder="Short bio about the author..."
                                rows={4}
                                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#1A4484] font-bold text-sm resize-none"
                              />
                            </div>
                            <div className="flex gap-2 pt-2">
                               {authorsList.length > 0 && <button type="button" onClick={() => { setEditingAuthorOriginalName(null); setIsAddingNewAuthor(false); if (!authorsList.find(a => a.name === authorName)) handleSelectAuthor(authorsList[0]); }} className="flex-1 py-3 bg-slate-100 font-bold rounded-xl text-xs uppercase text-slate-600 hover:bg-slate-200 transition-colors">Cancel</button>}
                               <button type="button" onClick={handleSaveNewAuthor} className="flex-1 py-3 bg-[#1A4484] font-bold rounded-xl text-xs uppercase text-white hover:bg-slate-900 transition-colors shadow-md">
                                 {editingAuthorOriginalName ? 'Update Author' : 'Save Author'}
                               </button>
                            </div>
                          </>
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