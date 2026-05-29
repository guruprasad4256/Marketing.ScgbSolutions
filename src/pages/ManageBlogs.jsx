import React, { useState, useRef, useMemo, useEffect } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import BlotFormatter from 'quill-blot-formatter';

// Import your Header component
import Header from "@/components/Header";

// Register Quill Modules
const Table = Quill.import('modules/table');
Quill.register({
  'modules/table': Table,
  'modules/blotFormatter': BlotFormatter
}, true);

// --- CONSTANTS ---
const SITES = ['Kyamme', 'Manhours On Hire', 'Tasked', 'Founders Counsel', 'Curated for founders'];
const SITE_URLS = { 
  "Tasked": "https://www.tasked.in", 
  "Manhours On Hire": "https://manhoursonhire.com", 
  "Curated for founders": "https://curatedforfounders.in", 
  "Founders Counsel": "https://founderscounsel.co", 
  "Kyamme": "https://kyamme.com" 
};
const SERVICE_TAGS = [
  "Accounting", "Content Writing", "Design", "Development", 
  "Digital Marketing", "Legal", "Recruitment", "Sales", 
  "Video Editing", "Virtual Assistant", "Others"
];

const RAW_URL = import.meta.env.VITE_API_URL || 'https://api.manhoursonhire.com';
const SERVER_URL = RAW_URL.replace(/\/+$/, '');

// ==========================================
// 1. ARCHIVE COMPONENT (LISTS ALL BLOGS + POPUP)
// ==========================================
const BlogArchive = ({ onCreate }) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // --- Popup States ---
  const [popupBlog, setPopupBlog] = useState(null);
  const [isFetchingPopup, setIsFetchingPopup] = useState(false);
  const [authorsList, setAuthorsList] = useState([]);

  // --- Quick Edit States for the Popup (EVERYTHING) ---
  const [quickTitle, setQuickTitle] = useState('');
  const [quickContent, setQuickContent] = useState('');
  const [quickSites, setQuickSites] = useState([]);
  const [quickTags, setQuickTags] = useState([]);
  const [quickAuthorName, setQuickAuthorName] = useState('');
  const [quickMetaTitle, setQuickMetaTitle] = useState('');
  const [quickMetaDescription, setQuickMetaDescription] = useState('');
  const [quickFaqs, setQuickFaqs] = useState([]);
  const [quickFeaturedImageFile, setQuickFeaturedImageFile] = useState(null);
  const [quickFeaturedImagePreview, setQuickFeaturedImagePreview] = useState(null);
  
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);

  const fetchBlogs = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${SERVER_URL}/api/blogs`);
      setBlogs(res.data?.blogs || res.data || []);
    } catch (err) {
      console.error("Error fetching blogs:", err);
      alert("Failed to load archive.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAuthors = async () => {
    try {
      const res = await axios.get(`${SERVER_URL}/api/authors`);
      setAuthorsList(res.data || []);
    } catch (err) {
      console.error("Failed to fetch authors", err);
    }
  };

  useEffect(() => {
    fetchBlogs();
    fetchAuthors();
  }, []);

  const handleOpenPopup = async (identifier) => {
    try {
      setIsFetchingPopup(true);
      const res = await axios.get(`${SERVER_URL}/api/blogs/${identifier}`);
      const fullBlog = res.data?.blog || res.data;
      
      setPopupBlog(fullBlog);
      setQuickTitle(fullBlog.title || '');
      setQuickContent(fullBlog.content || '');
      setQuickSites(fullBlog.targetWebsites || []);
      setQuickTags(fullBlog.tags || []);
      setQuickAuthorName(fullBlog.author?.name || '');
      setQuickMetaTitle(fullBlog.metaTitle || '');
      setQuickMetaDescription(fullBlog.metaDescription || '');
      setQuickFaqs(fullBlog.faqs || []);
      setQuickFeaturedImagePreview(fullBlog.featuredImage || null);
      setQuickFeaturedImageFile(null);
    } catch (err) {
      console.error("Failed to fetch specific blog details.", err);
      alert("Failed to open blog details.");
    } finally {
      setIsFetchingPopup(false);
    }
  };

  const closePopup = () => {
    setPopupBlog(null);
    setQuickTitle('');
    setQuickContent('');
    setQuickSites([]);
    setQuickTags([]);
    setQuickAuthorName('');
    setQuickMetaTitle('');
    setQuickMetaDescription('');
    setQuickFaqs([]);
    setQuickFeaturedImagePreview(null);
    setQuickFeaturedImageFile(null);
  };

  const toggleQuickSite = (site) => {
    setQuickSites(prev => prev.includes(site) ? prev.filter(s => s !== site) : [...prev, site]);
  };

  const toggleQuickTag = (tag) => {
    setQuickTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const addQuickFAQ = () => setQuickFaqs([...quickFaqs, { question: '', answer: '' }]);
  const removeQuickFAQ = (index) => setQuickFaqs(quickFaqs.filter((_, i) => i !== index));
  const updateQuickFAQ = (index, field, value) => {
    const n = [...quickFaqs];
    n[index][field] = value;
    setQuickFaqs(n);
  };

  const handleQuickImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setQuickFeaturedImageFile(file);
      setQuickFeaturedImagePreview(URL.createObjectURL(file));
    }
  };

  const handleQuickSave = async () => {
    if (!quickTitle.trim()) return alert("Title cannot be empty.");
    if (quickSites.length === 0) return alert("Please select at least one target website.");
    if (!quickAuthorName) return alert("Please select an author.");

    try {
      setIsSavingQuickEdit(true);
      
      let finalImageUrl = popupBlog.featuredImage;
      
      // Upload new image if selected
      if (quickFeaturedImageFile) {
        const formData = new FormData();
        formData.append('file', quickFeaturedImageFile);
        const uploadRes = await axios.post(`${SERVER_URL}/api/upload`, formData);
        finalImageUrl = uploadRes.data.url;
      }

      const selectedAuthorObj = authorsList.find(a => a.name === quickAuthorName) || { name: quickAuthorName };

      const updatedPayload = {
        ...popupBlog, 
        title: quickTitle.trim(),
        content: quickContent,
        targetWebsites: quickSites,
        tags: quickTags,
        author: selectedAuthorObj,
        metaTitle: quickMetaTitle.trim(),
        metaDescription: quickMetaDescription.trim(),
        faqs: quickFaqs,
        featuredImage: finalImageUrl
      };

      const identifier = popupBlog._id || popupBlog.id;
      await axios.put(`${SERVER_URL}/api/blogs/${identifier}`, updatedPayload);
      
      alert("Updates saved successfully!");
      
      fetchBlogs();
      closePopup();
    } catch (err) {
      console.error("Error saving quick edit", err);
      alert("Failed to save changes.");
    } finally {
      setIsSavingQuickEdit(false);
    }
  };

  const popupQuillModules = useMemo(() => ({
    toolbar: [
      [{ header: [1, 2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image', 'video'],
      ['clean']
    ]
  }), []);

  return (
    <>
      {isFetchingPopup && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/20 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="px-6 py-4 bg-white shadow-lg rounded-xl font-medium text-slate-700 text-sm flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-[#1A4484] border-t-transparent rounded-full animate-spin"></div>
            Loading Data...
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {popupBlog && !isFetchingPopup && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <h3 className="text-lg font-semibold text-slate-800">Quick Edit</h3>
                <button onClick={closePopup} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-200 text-slate-500 hover:bg-slate-300 transition-colors">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                
                {/* Title & Cover */}
                <div className="flex flex-col sm:flex-row gap-5 mb-6">
                  <div className="w-full sm:w-48 shrink-0 flex flex-col gap-2">
                    {quickFeaturedImagePreview ? (
                      <div className="relative group rounded-xl overflow-hidden border border-slate-200 h-32">
                        <img src={quickFeaturedImagePreview} alt="Cover" className="w-full h-full object-cover" />
                        <label className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity text-xs font-medium">
                          Change Cover
                          <input type="file" onChange={handleQuickImageSelect} className="hidden" accept="image/*" />
                        </label>
                      </div>
                    ) : (
                      <label className="w-full h-32 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs font-medium border border-dashed border-slate-300 cursor-pointer hover:bg-slate-50">
                        Upload Cover Image
                        <input type="file" onChange={handleQuickImageSelect} className="hidden" accept="image/*" />
                      </label>
                    )}
                  </div>

                  <div className="flex-1">
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Blog Title</label>
                    <textarea 
                      value={quickTitle}
                      onChange={(e) => setQuickTitle(e.target.value)}
                      className="text-lg font-semibold text-slate-900 mb-2 w-full bg-slate-50 border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-[#1A4484]/20 focus:border-[#1A4484] outline-none resize-none transition-all"
                      rows={2}
                      placeholder="Blog Title"
                    />
                    <div className="mt-1">
                      <p className="text-xs text-slate-500">Created: {new Date(popupBlog.createdAt || Date.now()).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                {/* Content Editor */}
                <div className="mb-6">
                  <label className="text-xs font-semibold text-slate-600 block mb-2">Text Content</label>
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden focus-within:ring-2 focus-within:ring-[#1A4484]/20 focus-within:border-[#1A4484] transition-all">
                    <ReactQuill theme="snow" value={quickContent} onChange={setQuickContent} modules={popupQuillModules} className="h-[250px] custom-quill-popup" />
                  </div>
                </div>

                {/* Settings Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-6 border-t border-slate-100">
                  
                  {/* Websites */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Target Websites</label>
                    <div className="grid grid-cols-2 gap-2">
                      {SITES.map(site => (
                        <label key={site} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${quickSites.includes(site) ? 'border-[#1A4484] bg-blue-50/50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                          <input type="checkbox" checked={quickSites.includes(site)} onChange={() => toggleQuickSite(site)} className="w-3.5 h-3.5 rounded border-slate-300 text-[#1A4484] focus:ring-[#1A4484]" />
                          <span className={`text-xs font-medium ${quickSites.includes(site) ? 'text-[#1A4484]' : 'text-slate-600'}`}>{site}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="text-xs font-semibold text-slate-600 block mb-2">Service Tags</label>
                    <div className="flex flex-wrap gap-2 max-h-[140px] overflow-y-auto custom-scrollbar p-1">
                      {SERVICE_TAGS.map(tag => (
                        <label key={tag} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md border cursor-pointer transition-all ${quickTags.includes(tag) ? 'border-[#1A4484] bg-blue-50' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                          <input type="checkbox" checked={quickTags.includes(tag)} onChange={() => toggleQuickTag(tag)} className="hidden" />
                          <span className={`text-[11px] font-medium ${quickTags.includes(tag) ? 'text-[#1A4484]' : 'text-slate-500'}`}>{tag}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* SEO & Author */}
                  <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                    <div className="space-y-4">
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-2">Author</label>
                        <select 
                          value={quickAuthorName} 
                          onChange={(e) => setQuickAuthorName(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#1A4484]/20 focus:border-[#1A4484] text-sm text-slate-700"
                        >
                          <option value="" disabled>Select an author...</option>
                          {authorsList.map((author, idx) => (
                            <option key={idx} value={author.name}>{author.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-2">Meta Title</label>
                        <input type="text" value={quickMetaTitle} onChange={(e) => setQuickMetaTitle(e.target.value)} placeholder="SEO Title" className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#1A4484]/20 focus:border-[#1A4484] text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-2">Meta Description</label>
                        <textarea value={quickMetaDescription} onChange={(e) => setQuickMetaDescription(e.target.value)} placeholder="SEO Description" rows={2} className="w-full bg-white border border-slate-200 rounded-lg p-3 outline-none focus:ring-2 focus:ring-[#1A4484]/20 focus:border-[#1A4484] text-sm resize-none" />
                      </div>
                    </div>

                    {/* FAQs */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex flex-col">
                      <div className="flex justify-between items-center p-3 border-b border-slate-200 bg-white shrink-0">
                        <span className="text-xs font-semibold text-slate-700">FAQs</span>
                        <button type="button" onClick={addQuickFAQ} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-1 rounded hover:bg-slate-200">+ Add</button>
                      </div>
                      <div className="p-3 space-y-3 overflow-y-auto max-h-[200px] custom-scrollbar">
                        {quickFaqs.length === 0 && <p className="text-xs text-slate-400 text-center py-4">No FAQs added.</p>}
                        {quickFaqs.map((faq, index) => (
                          <div key={index} className="bg-white p-3 rounded-lg border border-slate-200 relative">
                            <button onClick={() => removeQuickFAQ(index)} className="absolute top-2 right-2 text-slate-400 hover:text-red-500 text-xs">✕</button>
                            <input value={faq.question} onChange={(e) => updateQuickFAQ(index, 'question', e.target.value)} placeholder="Question" className="w-full text-xs font-medium bg-transparent border-b border-slate-100 pb-1 mb-2 outline-none focus:border-[#1A4484]" />
                            <textarea value={faq.answer} onChange={(e) => updateQuickFAQ(index, 'answer', e.target.value)} placeholder="Answer" rows={2} className="w-full text-xs bg-transparent outline-none resize-none text-slate-600" />
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                <button 
                  onClick={closePopup}
                  className="px-6 py-2.5 bg-white border border-slate-200 hover:bg-slate-100 text-slate-600 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleQuickSave}
                  disabled={isSavingQuickEdit}
                  className="px-8 py-2.5 bg-[#1A4484] hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 shadow-sm"
                >
                  {isSavingQuickEdit ? 'Saving...' : 'Save All Changes'}
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="max-w-[1400px] mx-auto px-6 py-8 relative z-10">
        <div className="flex justify-between items-center mb-8 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Blog Archive</h1>
            <p className="text-slate-500 text-sm mt-1">Manage and edit your published posts.</p>
          </div>
          <button 
            onClick={onCreate}
            className="bg-[#1A4484] hover:bg-slate-900 text-white rounded-lg text-sm font-medium px-5 py-2.5 transition-colors shadow-sm"
          >
            + Create Post
          </button>
        </div>

        {loading ? (
          <div className="text-center py-20 text-slate-500 text-sm font-medium flex flex-col items-center">
             <div className="w-6 h-6 border-2 border-[#1A4484] border-t-transparent rounded-full animate-spin mb-3"></div>
             Loading blogs...
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <span className="text-4xl mb-3 block opacity-80">📝</span>
            <h3 className="text-lg font-semibold text-slate-700">No blogs found</h3>
            <p className="text-slate-500 text-sm mt-1">Click create to publish your first post.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {blogs.map((blog) => {
              const identifier = blog._id || blog.id;
              const primarySite = blog.targetWebsites?.[0] || 'Kyamme';
              const liveUrl = `${SITE_URLS[primarySite] || 'https://kyamme.com'}/blogs/${blog.slug}`;
              
              return (
                <div key={identifier} className="bg-white border border-slate-200 shadow-sm hover:shadow-md rounded-2xl p-4 flex flex-col transition-shadow">
                  {blog.featuredImage ? (
                    <img src={blog.featuredImage} alt={blog.title} className="w-full h-40 object-cover rounded-xl mb-4 border border-slate-100" />
                  ) : (
                    <div className="w-full h-40 bg-slate-50 rounded-xl mb-4 flex items-center justify-center text-slate-400 text-sm border border-slate-100">No Cover</div>
                  )}
                  
                  <h2 className="text-base font-semibold text-slate-800 mb-2 line-clamp-2 leading-snug">
                    <a href={liveUrl} target="_blank" rel="noopener noreferrer" className="hover:text-[#1A4484] hover:underline transition-colors">
                      {blog.title}
                    </a>
                  </h2>
                  
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {blog.targetWebsites?.slice(0, 2).map(site => (
                      <span key={site} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">{site}</span>
                    ))}
                    {blog.targetWebsites?.length > 2 && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-md">+{blog.targetWebsites.length - 2}</span>}
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-slate-100">
                    <button 
                      onClick={() => handleOpenPopup(identifier)}
                      className="w-full py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg text-xs font-medium transition-colors"
                    >
                      Quick Edit
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};


// ==========================================
// 2. EDITOR COMPONENT (ONLY FOR CREATING)
// ==========================================
const BlogEditor = ({ onBack }) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [previewMode, setPreviewMode] = useState('none'); 
  
  const [showTableModal, setShowTableModal] = useState(false);
  const [tableRows, setTableRows] = useState(3);
  const [tableCols, setTableCols] = useState(3);
  const [openSidebarTab, setOpenSidebarTab] = useState('tags');

  const [selectedSites, setSelectedSites] = useState([]); 
  const [selectedTags, setSelectedTags] = useState([]); 
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  const [authorsList, setAuthorsList] = useState([]);
  const [isAddingNewAuthor, setIsAddingNewAuthor] = useState(true);
  const [editingAuthorOriginalName, setEditingAuthorOriginalName] = useState(null);
  const [authorName, setAuthorName] = useState('');
  const [authorImage, setAuthorImage] = useState('');
  const [authorLink, setAuthorLink] = useState('');
  const [authorDescription, setAuthorDescription] = useState('');
  const [isUploadingAuthorImage, setIsUploadingAuthorImage] = useState(false);

  const [openEditorFaqIndex, setOpenEditorFaqIndex] = useState(0);
  const [fontFamily] = useState("'Inter', sans-serif"); 

  const [faqs, setFaqs] = useState([]);
  const [featuredImageFile, setFeaturedImageFile] = useState(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const quillRef = useRef(null);

  useEffect(() => {
    const fetchAuthors = async () => {
      try {
        const res = await axios.get(`${SERVER_URL}/api/authors`);
        setAuthorsList(res.data);
        if (res.data.length > 0) {
          handleSelectAuthor(res.data[0]);
        }
      } catch (err) { console.error("Failed to fetch authors", err); }
    };
    fetchAuthors();
  }, []);

  const processContent = (html) => html.replace(/-/g, '&#8209;');
  const toggleItem = (_list, setList, item) => setList(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);

  const handleSelectAuthor = (author) => {
    setAuthorName(author.name); setAuthorImage(author.image || '');
    setAuthorLink(author.link || ''); setAuthorDescription(author.description || '');
    setIsAddingNewAuthor(false); setEditingAuthorOriginalName(null);
  };
  const handleEditAuthor = (e, author) => {
    e.stopPropagation(); setEditingAuthorOriginalName(author.name);
    setAuthorName(author.name); setAuthorImage(author.image || '');
    setAuthorLink(author.link || ''); setAuthorDescription(author.description || '');
    setIsAddingNewAuthor(true);
  };
  const handleSaveNewAuthor = async () => {
    if (!authorName.trim()) return alert("Author name required");
    try {
      const payload = { name: authorName.trim(), image: authorImage, link: authorLink, description: authorDescription };
      const res = await axios.post(`${SERVER_URL}/api/authors`, payload);
      setAuthorsList(prev => {
        const idx = prev.findIndex(a => a.name.toLowerCase() === res.data.name.toLowerCase());
        if (idx !== -1) { const n = [...prev]; n[idx] = res.data; return n; }
        return [...prev, res.data].sort((a, b) => a.name.localeCompare(b.name));
      });
      setIsAddingNewAuthor(false); setEditingAuthorOriginalName(null);
    } catch (err) { alert("Failed to save author."); }
  };
  const uploadAuthorImage = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      setIsUploadingAuthorImage(true);
      const formData = new FormData(); formData.append('file', file);
      const res = await axios.post(`${SERVER_URL}/api/upload`, formData);
      setAuthorImage(res.data.url);
    } catch (err) { alert('Upload failed.'); } finally { setIsUploadingAuthorImage(false); }
  };

  const addFAQ = () => { setFaqs([...faqs, { question: '', answer: '' }]); setOpenEditorFaqIndex(faqs.length); };
  const removeFAQ = (index) => setFaqs(faqs.filter((_, i) => i !== index));
  const updateFAQ = (index, field, value) => { const n = [...faqs]; n[index][field] = value; setFaqs(n); };

  const handleFeaturedImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) { setFeaturedImageFile(file); setFeaturedImagePreview(URL.createObjectURL(file)); setFeaturedImageUrl(''); setOpenSidebarTab('cover'); }
  };
  const uploadFeaturedImage = async (e) => {
    e.preventDefault(); if (!featuredImageFile) return;
    try {
      setIsUploadingImage(true);
      const formData = new FormData(); formData.append('file', featuredImageFile);
      const res = await axios.post(`${SERVER_URL}/api/upload`, formData);
      setFeaturedImageUrl(res.data.url); alert('Uploaded successfully!');
    } catch (err) { alert('Upload failed.'); } finally { setIsUploadingImage(false); }
  };
  const clearFeaturedImage = (e) => { e.preventDefault(); setFeaturedImageFile(null); setFeaturedImagePreview(null); setFeaturedImageUrl(''); };

  const imageHandler = () => {
    const input = document.createElement('input'); input.setAttribute('type', 'file'); input.setAttribute('accept', 'image/*'); input.click();
    input.onchange = async () => {
      if (!input.files?.[0]) return;
      const formData = new FormData(); formData.append('file', input.files[0]);
      try {
        const res = await axios.post(`${SERVER_URL}/api/upload`, formData);
        const editor = quillRef.current?.getEditor();
        if (editor) { const range = editor.getSelection(); editor.insertEmbed(range ? range.index : 0, 'image', res.data.url); }
      } catch (err) { alert('Editor image upload failed.'); }
    };
  };

  const handleInsertTable = (e) => { e.preventDefault(); const editor = quillRef.current?.getEditor(); if (editor) { editor.getModule('table').insertTable(tableRows, tableCols); setShowTableModal(false); } };
  const handleTableAction = (e, action) => {
    e.preventDefault(); const editor = quillRef.current?.getEditor(); if (!editor) return;
    try {
        const tableModule = editor.getModule('table');
        if (action === 'delete') { tableModule.deleteTable(); setShowTableModal(false); }
        else if (action === 'row') tableModule.insertRowBelow();
        else if (action === 'col') tableModule.insertColumnRight();
    } catch (err) { alert("Click inside a table first."); }
  };

  const modules = useMemo(() => ({
    toolbar: {
      container: [ [{ header: [1, 2, 3, 4, false] }], ['bold', 'italic', 'underline', 'strike', 'blockquote'], [{ color: [] }, { background: [] }], [{ list: 'ordered' }, { list: 'bullet' }], [{ align: [] }], ['table'], ['link', 'image', 'video'], ['clean'] ],
      handlers: { image: imageHandler, table: () => setShowTableModal(prev => !prev) }
    },
    table: true, blotFormatter: { overlay: { style: { border: '2px solid #1A4484' } } } 
  }), []);

  const handlePublish = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("Please enter a title.");
    if (!content || content === '<p><br></p>') return alert("Please write some content.");
    if (!featuredImageUrl && !featuredImagePreview) return alert('Featured image is required!');
    if (!featuredImageUrl && featuredImageFile) return alert('Please click "Confirm Upload" on your cover image first.');
    if (selectedSites.length === 0) return alert('Please select at least one website.');
    if (!authorName.trim()) return alert('Author name is required!');

    const payload = { 
      title: title.trim(), content, featuredImage: featuredImageUrl || featuredImagePreview, 
      faqs, targetWebsites: selectedSites, tags: selectedTags, categories: [], 
      styling: { fontFamily },
      author: { name: authorName.trim(), image: authorImage, link: authorLink, description: authorDescription },
      metaTitle: metaTitle.trim(), metaDescription: metaDescription.trim()
    };

    try {
      await axios.post(`${SERVER_URL}/api/authors`, payload.author); 
      const blogRes = await axios.post(`${SERVER_URL}/api/blogs`, payload);
      
      alert(`Blog Published Successfully!`);
      
      const postedSlug = blogRes.data?.blog?.slug || blogRes.data?.slug;
      const primarySite = selectedSites[0];
      const targetBaseUrl = SITE_URLS[primarySite];

      if (postedSlug && targetBaseUrl) {
        window.location.href = `${targetBaseUrl}/blogs/${postedSlug}`;
      } else {
        onBack(); 
      }
    } catch (err) { alert('Error: ' + (err.response?.data?.error || err.message)); }
  };

  return (
    <>
      <div className="max-w-[1400px] mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-200 mb-6">
        <div className="flex gap-4 items-center">
            <button 
                onClick={onBack}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
                ← Back
            </button>
            <div className="hidden md:flex bg-slate-100 p-1 rounded-lg">
                {['none', 'desktop', 'mobile'].map((mode) => (
                <button key={mode} onClick={() => setPreviewMode(mode)} className={`px-4 py-1.5 rounded-md text-xs font-medium uppercase transition-colors ${previewMode === mode ? 'bg-white text-[#1A4484] shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}>
                    {mode === 'none' ? 'Editor' : mode}
                </button>
                ))}
            </div>
        </div>
        <button form="blog-form" type="submit" className="bg-[#1A4484] hover:bg-slate-900 text-white rounded-lg text-sm font-medium transition-colors shadow-sm px-6 py-2.5">
          Publish Post
        </button>
      </div>

      <main className="max-w-[1400px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 px-6 pb-12">
        <div className={`xl:col-span-8 space-y-6 ${previewMode !== 'none' ? 'xl:col-span-12 flex justify-center' : ''}`}>
          {previewMode === 'none' ? (
            <>
              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl relative">
                <AnimatePresence>
                  {showTableModal && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="absolute top-[80px] left-1/2 -translate-x-1/2 z-[100] w-[300px] bg-white border border-slate-200 shadow-xl rounded-xl p-5">
                      <div className="flex justify-between items-center mb-4"><h4 className="text-sm font-semibold text-slate-800">Table Settings</h4><button onClick={() => setShowTableModal(false)} className="text-slate-400">✕</button></div>
                      <div className="flex gap-3 mb-4">
                          <div className="flex-1"><label className="text-xs text-slate-500 block mb-1">Rows</label><input type="number" min={1} max={20} value={tableRows} onChange={(e) => setTableRows(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 p-2 rounded-md outline-none text-sm"/></div>
                          <div className="flex-1"><label className="text-xs text-slate-500 block mb-1">Cols</label><input type="number" min={1} max={10} value={tableCols} onChange={(e) => setTableCols(parseInt(e.target.value))} className="w-full bg-slate-50 border border-slate-200 p-2 rounded-md outline-none text-sm"/></div>
                      </div>
                      <button onMouseDown={(e) => e.preventDefault()} onClick={handleInsertTable} className="w-full py-2 bg-[#1A4484] text-white rounded-md text-sm font-medium mb-4">Insert Table</button>
                      <div className="pt-3 border-t border-slate-100 grid grid-cols-3 gap-2">
                          <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleTableAction(e, 'row')} className="py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium">+ Row</button>
                          <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleTableAction(e, 'col')} className="py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium">+ Col</button>
                          <button onMouseDown={(e) => e.preventDefault()} onClick={(e) => handleTableAction(e, 'delete')} className="py-1.5 bg-red-50 text-red-600 rounded-md text-xs font-medium">Delete</button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form id="blog-form" onSubmit={handlePublish} className="flex flex-col pt-2">
                  <div className="px-8 pt-8 pb-4">
                    <textarea placeholder="Blog Title..." value={title} onChange={(e) => setTitle(e.target.value)} required rows={1} className="w-full border-none shadow-none text-3xl font-bold focus:outline-none focus:ring-0 resize-none p-0 bg-transparent overflow-hidden text-slate-800 placeholder:text-slate-300" onInput={(e) => { e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px'; }} />
                  </div>
                  <div className="flex-1 studio-editor">
                    <ReactQuill ref={quillRef} theme="snow" placeholder="Write your content here..." value={content} onChange={setContent} modules={modules} />
                  </div>
                </form>
              </div>

              <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
                <div className="flex justify-between items-center p-6 border-b border-slate-100">
                  <div>
                    <h3 className="text-base font-semibold text-slate-800">FAQs</h3>
                    <p className="text-xs text-slate-500 mt-1">Add structured questions for SEO.</p>
                  </div>
                  <button type="button" onClick={addFAQ} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors">Add Question</button>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {faqs.length === 0 && ( <div className="py-8 text-center text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">No FAQs added yet.</div> )}
                    {faqs.map((faq, index) => {
                      const isOpen = openEditorFaqIndex === index;
                      return (
                        <div key={index} className="border border-slate-200 rounded-xl overflow-hidden">
                          <div className="p-4 cursor-pointer flex items-center justify-between bg-slate-50 hover:bg-slate-100 transition-colors" onClick={() => setOpenEditorFaqIndex(isOpen ? null : index)}>
                            <div className="font-medium text-sm text-slate-700 truncate">{faq.question || `Question ${index + 1}`}</div>
                            <div className="flex items-center gap-3">
                              <span className={`text-slate-400 text-xs transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
                              <button type="button" onClick={(e) => { e.stopPropagation(); removeFAQ(index); }} className="text-slate-400 hover:text-red-500 transition-colors">✕</button>
                            </div>
                          </div>
                          <AnimatePresence>
                            {isOpen && (
                              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden bg-white">
                                <div className="p-4 border-t border-slate-100 space-y-3">
                                  <div>
                                    <label className="text-xs text-slate-500 block mb-1">Question</label>
                                    <input placeholder="Enter question" value={faq.question} onChange={(e) => updateFAQ(index, 'question', e.target.value)} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#1A4484]" />
                                  </div>
                                  <div>
                                    <label className="text-xs text-slate-500 block mb-1">Answer</label>
                                    <textarea placeholder="Enter answer" value={faq.answer} onChange={(e) => updateFAQ(index, 'answer', e.target.value)} className="w-full bg-white border border-slate-200 rounded-md px-3 py-2 text-sm outline-none focus:border-[#1A4484] min-h-[80px] resize-y" />
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="w-full max-w-5xl mx-auto px-8 py-12 bg-white rounded-2xl shadow-sm border border-slate-200 mt-4">
                {featuredImagePreview && <div className="mb-8 rounded-xl overflow-hidden border border-slate-100"><img src={featuredImagePreview} alt="Cover" className="w-full h-auto max-h-[400px] object-cover" /></div>}
                <h1 className="text-4xl font-bold mb-8 text-slate-900 leading-tight">{title || 'Untitled Post'}</h1>
                <div className="preview-content"><div className="ql-editor" dangerouslySetInnerHTML={{ __html: processContent(content) }} /></div>
            </div>
          )}
        </div>

        {previewMode === 'none' && (
          <aside className="xl:col-span-4 space-y-5">
            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <button type="button" onClick={() => setOpenSidebarTab(openSidebarTab === 'cover' ? null : 'cover')} className="w-full flex justify-between items-center p-4 bg-slate-50 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-700">Cover & SEO</span>
                <span className={`text-slate-400 text-xs transition-transform ${openSidebarTab === 'cover' ? 'rotate-180' : ''}`}>▼</span>
              </button>
              <AnimatePresence>
                {openSidebarTab === 'cover' && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="p-5 space-y-5">
                      {!featuredImagePreview ? (
                        <div className="relative h-32 border border-dashed border-slate-300 rounded-lg flex items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                          <input type="file" onChange={handleFeaturedImageSelect} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                          <span className="text-sm font-medium text-slate-500">Upload Cover Image</span>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <img src={featuredImagePreview} className="w-full h-32 object-cover rounded-lg border border-slate-200" alt="Preview" />
                          <div className="flex gap-2">
                            {(!featuredImageUrl && featuredImageFile) && <button onClick={uploadFeaturedImage} type="button" className="flex-1 py-2 bg-[#1A4484] text-white font-medium rounded-md text-xs">{isUploadingImage ? 'Uploading...' : 'Confirm'}</button>}
                            <button onClick={clearFeaturedImage} type="button" className="flex-1 py-2 bg-slate-100 text-slate-600 font-medium rounded-md text-xs hover:bg-slate-200">Remove</button>
                          </div>
                        </div>
                      )}
                      <div className="space-y-3 pt-2">
                          <div><label className="text-xs text-slate-500 block mb-1">Meta Title</label><input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="SEO Title" className="w-full border border-slate-200 rounded-md p-2 text-sm outline-none focus:border-[#1A4484]"/></div>
                          <div><label className="text-xs text-slate-500 block mb-1">Meta Description</label><textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} placeholder="SEO Description" rows={2} className="w-full border border-slate-200 rounded-md p-2 text-sm outline-none focus:border-[#1A4484] resize-none"/></div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <button type="button" onClick={() => setOpenSidebarTab(openSidebarTab === 'sites' ? null : 'sites')} className="w-full flex justify-between items-center p-4 bg-slate-50 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-700">Websites</span>
                <span className={`text-slate-400 text-xs transition-transform ${openSidebarTab === 'sites' ? 'rotate-180' : ''}`}>▼</span>
              </button>
              <AnimatePresence>
                {openSidebarTab === 'sites' && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="p-4 space-y-2">
                      {SITES.map(site => (
                        <label key={site} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={selectedSites.includes(site)} onChange={() => toggleItem(selectedSites, setSelectedSites, site)} className="rounded border-slate-300 text-[#1A4484] focus:ring-[#1A4484]" />
                          <span className="text-sm text-slate-700">{site}</span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <button type="button" onClick={() => setOpenSidebarTab(openSidebarTab === 'tags' ? null : 'tags')} className="w-full flex justify-between items-center p-4 bg-slate-50 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-700">Service Tags</span>
                <span className={`text-slate-400 text-xs transition-transform ${openSidebarTab === 'tags' ? 'rotate-180' : ''}`}>▼</span>
              </button>
              <AnimatePresence>
                {openSidebarTab === 'tags' && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="p-4 space-y-2">
                      {SERVICE_TAGS.map(tag => (
                        <label key={tag} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 cursor-pointer">
                          <input type="checkbox" checked={selectedTags.includes(tag)} onChange={() => toggleItem(selectedTags, setSelectedTags, tag)} className="rounded border-slate-300 text-[#1A4484] focus:ring-[#1A4484]" />
                          <span className="text-sm text-slate-700">{tag}</span>
                        </label>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="bg-white border border-slate-200 shadow-sm rounded-xl overflow-hidden">
              <button type="button" onClick={() => setOpenSidebarTab(openSidebarTab === 'author' ? null : 'author')} className="w-full flex justify-between items-center p-4 bg-slate-50 border-b border-slate-100">
                <span className="text-sm font-semibold text-slate-700">Author</span>
                <span className={`text-slate-400 text-xs transition-transform ${openSidebarTab === 'author' ? 'rotate-180' : ''}`}>▼</span>
              </button>
              <AnimatePresence>
                {openSidebarTab === 'author' && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden">
                    <div className="p-5 space-y-4">
                      {authorsList.length > 0 && !isAddingNewAuthor ? (
                        <>
                          <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar pr-2">
                            {authorsList.map((author, idx) => (
                              <div key={idx} onClick={() => handleSelectAuthor(author)} className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer ${authorName === author.name ? 'border-[#1A4484] bg-blue-50' : 'border-transparent hover:bg-slate-50'}`}>
                                <div className="flex items-center gap-3">
                                  {author.image ? <img src={author.image} alt={author.name} className="w-6 h-6 rounded-full object-cover" /> : <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-[10px]">{author.name.charAt(0)}</div>}
                                  <span className="text-sm font-medium text-slate-700">{author.name}</span>
                                </div>
                                <button type="button" onClick={(e) => handleEditAuthor(e, author)} className="text-xs text-slate-400 hover:text-[#1A4484]">Edit</button>
                              </div>
                            ))}
                          </div>
                          <button type="button" onClick={() => { setEditingAuthorOriginalName(null); setAuthorName(''); setAuthorImage(''); setAuthorLink(''); setAuthorDescription(''); setIsAddingNewAuthor(true); }} className="w-full py-2 bg-slate-50 border border-slate-200 rounded-md text-xs font-medium text-slate-600 hover:bg-slate-100">Add New Author</button>
                        </>
                      ) : (
                        <div className="space-y-3">
                          <div><label className="text-xs text-slate-500 block mb-1">Name</label><input type="text" value={authorName} onChange={(e) => setAuthorName(e.target.value)} required className="w-full border border-slate-200 rounded-md p-2 text-sm outline-none focus:border-[#1A4484]"/></div>
                          <div className="relative h-10 border border-slate-200 rounded-md flex items-center justify-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer">
                            <input type="file" onChange={uploadAuthorImage} className="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" />
                            <span className="text-xs font-medium text-slate-500">{isUploadingAuthorImage ? 'Uploading...' : (authorImage ? 'Change Image' : 'Upload Image')}</span>
                          </div>
                          <div className="flex gap-2 pt-2">
                             {authorsList.length > 0 && <button type="button" onClick={() => { setIsAddingNewAuthor(false); handleSelectAuthor(authorsList[0]); }} className="flex-1 py-2 bg-slate-100 rounded-md text-xs font-medium text-slate-600">Cancel</button>}
                             <button type="button" onClick={handleSaveNewAuthor} className="flex-1 py-2 bg-[#1A4484] text-white rounded-md text-xs font-medium">Save</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </aside>
        )}
      </main>
    </>
  );
};


// ==========================================
// 3. MAIN DASHBOARD / ROOT COMPONENT
// ==========================================
export default function BlogManager() {
  const [view, setView] = useState('archive'); 

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-[#f8fafc] overflow-x-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        body { font-family: 'Inter', sans-serif; }
        
        /* Main Editor CSS */
        .studio-editor .ql-container.ql-snow { border: none !important; font-family: 'Inter', sans-serif !important; font-size: 15px; }
        .studio-editor .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #e2e8f0 !important; padding: 12px 16px !important; background: #f8fafc !important; border-radius: 1rem 1rem 0 0; }
        .studio-editor .ql-editor { padding: 32px !important; min-height: 400px; line-height: 1.7; color: #334155; }
        .studio-editor .ql-editor h1, .studio-editor .ql-editor h2, .studio-editor .ql-editor h3 { color: #0f172a; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.5em; }
        .studio-editor .ql-editor p { margin-bottom: 1.2em; }
        .studio-editor .ql-editor ul, .studio-editor .ql-editor ol { margin-bottom: 1.2em; padding-left: 1.5em; }
        .studio-editor .ql-editor li { margin-bottom: 0.5em; }
        .studio-editor .ql-editor table { border-collapse: collapse; width: 100%; margin: 20px 0; }
        .studio-editor .ql-editor td, .studio-editor .ql-editor th { border: 1px solid #e2e8f0 !important; padding: 12px; }
        
        /* Premium Popup Quick Edit Quill Styles */
        .custom-quill-popup .ql-container.ql-snow { border: none !important; font-family: 'Inter', sans-serif !important; font-size: 14px; }
        .custom-quill-popup .ql-toolbar.ql-snow { border: none !important; border-bottom: 1px solid #e2e8f0 !important; background: #f8fafc; padding: 8px; border-radius: 0.75rem 0.75rem 0 0; }
        .custom-quill-popup .ql-editor { padding: 16px; line-height: 1.7; color: #334155; }
        .custom-quill-popup .ql-editor p { margin-bottom: 1.2em; }
        .custom-quill-popup .ql-editor h1, .custom-quill-popup .ql-editor h2, .custom-quill-popup .ql-editor h3 { color: #0f172a; font-weight: 600; margin-top: 1.5em; margin-bottom: 0.5em; }
        .custom-quill-popup .ql-editor ul, .custom-quill-popup .ql-editor ol { margin-bottom: 1.2em; padding-left: 1.5em; }
        .custom-quill-popup .ql-editor li { margin-bottom: 0.5em; }
        
        /* Smooth Scrollbar */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>

      <Header />

      {view === 'archive' ? (
        <BlogArchive onCreate={() => setView('editor')} />
      ) : (
        <BlogEditor onBack={() => setView('archive')} />
      )}
    </div>
  );
}