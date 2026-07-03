import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Plus, Search, Loader2, AlertCircle, ExternalLink, 
  Settings, Trash2, Zap, LayoutTemplate,
  ChevronDown, Image as ImageIcon, 
  Code, Monitor, Smartphone, Database, Server, Cloud, 
  Shield, CheckCircle, Users, Briefcase, TrendingUp, 
  ShoppingCart, DollarSign, Gauge, FileText, Clock, Play, RefreshCw, Sliders,
  PenTool, Palette, Film, Scale, Calculator, FileSpreadsheet, Layout, Target, 
  Megaphone, Calendar, Clipboard, Lightbulb, BookOpen, UserPlus
} from 'lucide-react';

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import Header from "@/components/Header";

// Environment setup matching your architecture
const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const RAW_URL = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) 
  ? import.meta.env.VITE_API_URL 
  : (isLocalhost ? 'http://localhost:5000' : 'https://api.manhoursonhire.com'); 
const SERVER_URL = RAW_URL.replace(/\/+$/, '');

// Comprehensive Icon Selection Registry
const AVAILABLE_ICONS = [
  { name: "Code", icon: <Code className="w-4 h-4" /> },
  { name: "Monitor", icon: <Monitor className="w-4 h-4" /> },
  { name: "Smartphone", icon: <Smartphone className="w-4 h-4" /> },
  { name: "ShoppingCart", icon: <ShoppingCart className="w-4 h-4" /> },
  { name: "Database", icon: <Database className="w-4 h-4" /> },
  { name: "Server", icon: <Server className="w-4 h-4" /> },
  { name: "Cloud", icon: <Cloud className="w-4 h-4" /> },
  { name: "Shield", icon: <Shield className="w-4 h-4" /> },
  { name: "Zap", icon: <Zap className="w-4 h-4" /> },
  { name: "CheckCircle", icon: <CheckCircle className="w-4 h-4" /> },
  { name: "Users", icon: <Users className="w-4 h-4" /> },
  { name: "Briefcase", icon: <Briefcase className="w-4 h-4" /> },
  { name: "TrendingUp", icon: <TrendingUp className="w-4 h-4" /> },
  { name: "DollarSign", icon: <DollarSign className="w-4 h-4" /> },
  { name: "Gauge", icon: <Gauge className="w-4 h-4" /> },
  { name: "FileText", icon: <FileText className="w-4 h-4" /> },
  { name: "Clock", icon: <Clock className="w-4 h-4" /> },
  { name: "Play", icon: <Play className="w-4 h-4" /> },
  { name: "RefreshCw", icon: <RefreshCw className="w-4 h-4" /> },
  { name: "Sliders", icon: <Sliders className="w-4 h-4" /> },
  { name: "PenTool", icon: <PenTool className="w-4 h-4" /> },
  { name: "Palette", icon: <Palette className="w-4 h-4" /> },
  { name: "Film", icon: <Film className="w-4 h-4" /> },
  { name: "Scale", icon: <Scale className="w-4 h-4" /> },
  { name: "Calculator", icon: <Calculator className="w-4 h-4" /> },
  { name: "FileSpreadsheet", icon: <FileSpreadsheet className="w-4 h-4" /> },
  { name: "Layout", icon: <Layout className="w-4 h-4" /> },
  { name: "Target", icon: <Target className="w-4 h-4" /> },
  { name: "Megaphone", icon: <Megaphone className="w-4 h-4" /> },
  { name: "Calendar", icon: <Calendar className="w-4 h-4" /> },
  { name: "Clipboard", icon: <Clipboard className="w-4 h-4" /> },
  { name: "Lightbulb", icon: <Lightbulb className="w-4 h-4" /> },
  { name: "BookOpen", icon: <BookOpen className="w-4 h-4" /> },
  { name: "UserPlus", icon: <UserPlus className="w-4 h-4" /> },
];

// ==========================================
// FULL EDIT MODAL COMPONENT (Injected)
// ==========================================
const FullEditModal = ({ roleId, onClose, onSuccess }) => {
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  // --- GLOBAL INFO & SEO STATE ---
  const [roleName, setRoleName] = useState('');
  const [slug, setSlug] = useState('');
  const [openSidebarTab, setOpenSidebarTab] = useState('seo');
  const [metaTitle, setMetaTitle] = useState('');
  const [metaDescription, setMetaDescription] = useState('');

  // --- 1. HERO SECTION STATE ---
  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [featuredImageFile, setFeaturedImageFile] = useState(null);
  const [featuredImagePreview, setFeaturedImagePreview] = useState(null);
  const [featuredImageUrl, setFeaturedImageUrl] = useState('');

  // --- 2. CAPABILITIES (PORTFOLIO BENTO GRID) STATE ---
  const [portfolioHeading, setPortfolioHeading] = useState('Built by Our Developers.');
  const [portfolioSubheading, setPortfolioSubheading] = useState('Our developers ship high-load systems and pixel-perfect UIs that drive actual business growth.');
  const [capabilities, setCapabilities] = useState([]);
  const [openCapabilityIndex, setOpenCapabilityIndex] = useState(null);

  // --- 3. BUSINESS CASE SECTION STATE ---
  const [bcBadge, setBcBadge] = useState('The Business Case');
  const [bcHeadingPrefix, setBcHeadingPrefix] = useState('Your Website Is Your Best');
  const [bcHeadingHighlight, setBcHeadingHighlight] = useState('Salesperson.');
  const [bcSubheading, setBcSubheading] = useState("An expert web developer doesn't just build things they protect your revenue, your brand, and your users.");
  const [businessCases, setBusinessCases] = useState([]);
  const [openBcIndex, setOpenBcIndex] = useState(null);

  // --- 4. SERVICES SECTION STATE ---
  const [servicesBadge, setServicesBadge] = useState('Services • What You Can Hand Off From Day One');
  const [servicesHeadingPrefix, setServicesHeadingPrefix] = useState('Specialists Who Ship.');
  const [servicesHeadingHighlight, setServicesHeadingHighlight] = useState('Not Generalists Who Dabble.');
  const [servicesSubheading, setServicesSubheading] = useState("Here's what your hired developer can start building immediately:");
  const [services, setServices] = useState([]);
  const [openServiceIndex, setOpenServiceIndex] = useState(null);

  // --- 5. TECHNOLOGIES GRID STATE ---
  const [techBadge, setTechBadge] = useState('Technologies Used');
  const [techHeadingPrefix, setTechHeadingPrefix] = useState('The tools and tech stack');
  const [techHeadingHighlight, setTechHeadingHighlight] = useState('we work with.');
  const [techSubheading, setTechSubheading] = useState("Whether you're building from scratch or extending an existing stack, our developers bring hands-on expertise.");
  const [techCategories, setTechCategories] = useState([]);
  const [openTechIndex, setOpenTechIndex] = useState(null);

  // --- 6. HOW IT WORKS TIMELINE STATE ---
  const [hiwBadge, setHiwBadge] = useState('How It Works');
  const [hiwHeadingPrefix, setHiwHeadingPrefix] = useState('From Brief to');
  const [hiwHeadingHighlight, setHiwHeadingHighlight] = useState('Build.');
  const [howItWorksSteps, setHowItWorksSteps] = useState([]);
  const [openHiwIndex, setOpenHiwIndex] = useState(null);

  // --- 7. FAQ SECTION STATE ---
  const [faqs, setFaqs] = useState([]);
  const [openEditorFaqIndex, setOpenEditorFaqIndex] = useState(null);

  // FETCH EXISTING DATA ON MOUNT
  useEffect(() => {
    const fetchRoleData = async () => {
      try {
        setIsLoadingData(true);
        const endpoint = SERVER_URL.endsWith('/api') ? '/roles' : '/api/roles';
        const res = await axios.get(`${SERVER_URL}${endpoint}`);
        const targetRole = res.data.find(r => r._id === roleId);
        
        if (!targetRole) {
          alert('Role not found!');
          onClose();
          return;
        }

        setRoleName(targetRole.roleName || '');
        setSlug(targetRole.slug || '');
        setMetaTitle(targetRole.seo?.metaTitle || '');
        setMetaDescription(targetRole.seo?.metaDescription || '');

        const pd = targetRole.pageData || {};

        setHeroTitle(pd.hero?.title || '');
        setHeroSubtitle(pd.hero?.subtitle || '');
        setFeaturedImageUrl(pd.hero?.backgroundImage || '');
        if (pd.hero?.backgroundImage) setFeaturedImagePreview(pd.hero.backgroundImage);

        setPortfolioHeading(pd.portfolio?.heading || '');
        setPortfolioSubheading(pd.portfolio?.subheading || '');
        setCapabilities(pd.portfolio?.projects || []);

        setBcBadge(pd.businessCase?.badge || '');
        setBcHeadingPrefix(pd.businessCase?.headingPrefix || '');
        setBcHeadingHighlight(pd.businessCase?.headingHighlight || '');
        setBcSubheading(pd.businessCase?.subheading || '');
        setBusinessCases(pd.businessCase?.reasons || []);

        setServicesBadge(pd.services?.badge || 'Services • What You Can Hand Off From Day One');
        setServicesHeadingPrefix(pd.services?.headingPrefix || 'Specialists Who Ship.');
        setServicesHeadingHighlight(pd.services?.headingHighlight || 'Not Generalists Who Dabble.');
        setServicesSubheading(pd.services?.subheading || "Here's what your hired developer can start building immediately:");
        setServices(pd.services?.services || []);

        setTechBadge(pd.technologies?.badge || '');
        setTechHeadingPrefix(pd.technologies?.headingPrefix || '');
        setTechHeadingHighlight(pd.technologies?.headingHighlight || '');
        setTechSubheading(pd.technologies?.subheading || '');
        
        const mappedTech = (pd.technologies?.categories || []).map(cat => ({
          ...cat,
          tagsInput: cat.tags ? cat.tags.join(', ') : ''
        }));
        setTechCategories(mappedTech);

        setHiwBadge(pd.howItWorks?.badge || '');
        setHiwHeadingPrefix(pd.howItWorks?.headingPrefix || '');
        setHiwHeadingHighlight(pd.howItWorks?.headingHighlight || '');
        setHowItWorksSteps(pd.howItWorks?.steps || []);

        setFaqs(pd.faq || []);
      } catch (err) {
        console.error("Failed to load role data", err);
        alert("Failed to load role data. Check console.");
      } finally {
        setIsLoadingData(false);
      }
    };

    if (roleId) fetchRoleData();
  }, [roleId, onClose]);

  // HANDLERS
  const handleFeaturedImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFeaturedImageFile(file);
      setFeaturedImagePreview(URL.createObjectURL(file));
      setFeaturedImageUrl('');
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
      alert('Featured image uploaded successfully!');
    } catch (err) { alert('Upload failed.'); } 
    finally { setIsUploadingImage(false); }
  };

  const clearFeaturedImage = (e) => {
    e.preventDefault(); setFeaturedImageFile(null); setFeaturedImagePreview(null); setFeaturedImageUrl('');
  };

  // Explicit, robust mapping updates for state reference synchronizations
  const addCapability = () => {
    const autoTheme = capabilities.length % 2 === 0 ? 'red' : 'yellow';
    setCapabilities([...capabilities, { title: '', category: '', desc: '', icon: 'ShoppingCart', theme: autoTheme, size: 'md:col-span-2', logos: [] }]);
    setOpenCapabilityIndex(capabilities.length);
  };
  const updateCapability = (index, field, value) => {
    const newCaps = [...capabilities];
    newCaps[index] = { ...newCaps[index], [field]: value };
    setCapabilities(newCaps);
  };
  const removeCapability = (index) => {
    const filtered = capabilities.filter((_, i) => i !== index).map((cap, idx) => ({ ...cap, theme: idx % 2 === 0 ? 'red' : 'yellow' }));
    setCapabilities(filtered); if (openCapabilityIndex === index) setOpenCapabilityIndex(null);
  };
  const addLogoToCapability = (capIndex) => {
    const newCaps = [...capabilities];
    newCaps[capIndex] = { ...newCaps[capIndex], logos: [...newCaps[capIndex].logos, { name: '', url: '' }] };
    setCapabilities(newCaps);
  };
  const updateLogoInCapability = (capIndex, logoIndex, field, value) => {
    const newCaps = [...capabilities];
    const updatedLogos = [...newCaps[capIndex].logos];
    updatedLogos[logoIndex] = { ...updatedLogos[logoIndex], [field]: value };
    newCaps[capIndex] = { ...newCaps[capIndex], logos: updatedLogos };
    setCapabilities(newCaps);
  };
  const removeLogoFromCapability = (capIndex, logoIndex) => {
    const newCaps = [...capabilities];
    newCaps[capIndex] = { ...newCaps[capIndex], logos: newCaps[capIndex].logos.filter((_, i) => i !== logoIndex) };
    setCapabilities(newCaps);
  };

  const addBusinessCase = () => { 
    setBusinessCases([...businessCases, { stat: '', title: '', desc: '', icon: 'Zap' }]); 
    setOpenBcIndex(businessCases.length); 
  };
  const updateBusinessCase = (index, field, value) => { 
    const newBc = [...businessCases]; 
    newBc[index] = { ...newBc[index], [field]: value }; 
    setBusinessCases(newBc); 
  };
  const removeBusinessCase = (index) => { 
    setBusinessCases(businessCases.filter((_, i) => i !== index)); 
    if (openBcIndex === index) setOpenBcIndex(null); 
  };

  const addService = () => {
    setServices([...services, { title: '', description: '', icon: 'CheckCircle' }]);
    setOpenServiceIndex(services.length);
  };
  const updateService = (index, field, value) => {
    const newServices = [...services];
    newServices[index] = { ...newServices[index], [field]: value };
    setServices(newServices);
  };
  const removeService = (index) => {
    setServices(services.filter((_, i) => i !== index));
    if (openServiceIndex === index) setOpenServiceIndex(null);
  };

  const addTechCategory = () => { 
    setTechCategories([...techCategories, { category: '', icon: 'Monitor', tagsInput: '' }]); 
    setOpenTechIndex(techCategories.length); 
  };
  const updateTechCategory = (index, field, value) => { 
    const newTechs = [...techCategories]; 
    newTechs[index] = { ...newTechs[index], [field]: value }; 
    setTechCategories(newTechs); 
  };
  const removeTechCategory = (index) => { 
    setTechCategories(techCategories.filter((_, i) => i !== index)); 
    if (openTechIndex === index) setOpenTechIndex(null); 
  };

  const addHiwStep = () => {
    const stepNum = String(howItWorksSteps.length + 1).padStart(2, '0');
    setHowItWorksSteps([...howItWorksSteps, { num: stepNum, icon: 'FileText', title: '', desc: '' }]);
    setOpenHiwIndex(howItWorksSteps.length);
  };
  const updateHiwStep = (index, field, value) => { 
    const newSteps = [...howItWorksSteps]; 
    newSteps[index] = { ...newSteps[index], [field]: value }; 
    setHowItWorksSteps(newSteps); 
  };
  const removeHiwStep = (index) => {
    const filtered = howItWorksSteps.filter((_, i) => i !== index).map((step, idx) => ({ ...step, num: String(idx + 1).padStart(2, '0') }));
    setHowItWorksSteps(filtered); if (openHiwIndex === index) setOpenHiwIndex(null);
  };

  const addFAQ = () => { 
    setFaqs([...faqs, { question: '', answer: '' }]); 
    setOpenEditorFaqIndex(faqs.length); 
  };
  const updateFAQ = (index, field, value) => { 
    const newFaqs = [...faqs]; 
    newFaqs[index] = { ...newFaqs[index], [field]: value }; 
    setFaqs(newFaqs); 
  };
  const removeFAQ = (index) => { 
    setFaqs(faqs.filter((_, i) => i !== index)); 
    if (openEditorFaqIndex === index) setOpenEditorFaqIndex(null); 
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    if (!roleName.trim()) return alert("Please select an internal Role Name Configuration.");
    if (!heroTitle.trim()) return alert("Please enter a Hero Section H1 Title.");
    if (featuredImageFile && !featuredImageUrl) return alert('Please click "Confirm Upload" on your chosen featured asset layout first.');
    if (!featuredImageUrl) return alert("A Featured Image Asset is required.");

    const finalSlug = slug.trim() || roleName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
    const processedTechCategories = techCategories.map(cat => ({
      category: cat.category.trim(), 
      icon: cat.icon, 
      tags: cat.tagsInput ? cat.tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : []
    }));

    const payload = {
      roleName: roleName.trim(), 
      slug: finalSlug, 
      seo: { metaTitle: metaTitle.trim(), metaDescription: metaDescription.trim() },
      pageData: {
        hero: { title: heroTitle.trim(), subtitle: heroSubtitle, backgroundImage: featuredImageUrl },
        portfolio: { heading: portfolioHeading.trim(), subheading: portfolioSubheading.trim(), projects: capabilities },
        businessCase: { badge: bcBadge.trim(), headingPrefix: bcHeadingPrefix.trim(), headingHighlight: bcHeadingHighlight.trim(), subheading: bcSubheading.trim(), reasons: businessCases },
        services: { badge: servicesBadge.trim(), headingPrefix: servicesHeadingPrefix.trim(), headingHighlight: servicesHeadingHighlight.trim(), subheading: servicesSubheading.trim(), services: services },
        technologies: { badge: techBadge.trim(), headingPrefix: techHeadingPrefix.trim(), headingHighlight: techHeadingHighlight.trim(), subheading: techSubheading.trim(), categories: processedTechCategories },
        howItWorks: { badge: hiwBadge.trim(), headingPrefix: hiwHeadingPrefix.trim(), headingHighlight: hiwHeadingHighlight.trim(), steps: howItWorksSteps },
        faq: faqs
      }
    };

    try {
      setIsPublishing(true);
      const publishEndpoint = SERVER_URL.endsWith('/api') ? `/roles/${roleId}` : `/api/roles/${roleId}`;
      await axios.put(`${SERVER_URL}${publishEndpoint}`, payload);
      alert('Role Page Updated Successfully!');
      onSuccess();
    } catch (err) {
      console.error("Update Exception Catch:", err);
      alert('Error updating configuration layouts: ' + (err.response?.data?.error || err.message));
    } finally {
      setIsPublishing(false);
    }
  };

  if (isLoadingData) {
    return (
      <div className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-50/90 backdrop-blur-sm">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 animate-spin text-[#1A4484] mb-4" />
          <p className="text-slate-600 font-medium">Extracting layout configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100000] bg-slate-50 overflow-y-auto">
      {/* Sticky Header inside the Full Edit Modal */}
      <div className="sticky top-0 z-50 bg-white border-b border-slate-200 shadow-sm px-6 lg:px-10 py-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Full Edit Mode</h1>
          <p className="text-xs text-slate-500 mt-0.5">Modifying architecture for <span className="font-semibold text-slate-700">{roleName}</span>.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-md px-6 h-10 text-sm font-semibold">Cancel</Button>
          <Button onClick={handleUpdateRole} disabled={isPublishing} className="bg-[#1A4484] hover:bg-[#112d5e] text-white rounded-md px-6 h-10 text-sm font-semibold shadow-sm">
            {isPublishing ? 'Updating Layout...' : 'Save Updates'}
          </Button>
        </div>
      </div>

      <div className="max-w-[1500px] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-8 p-6 lg:px-10 mt-4 pb-20">
        <div className="xl:col-span-8 space-y-8">
          
          {/* 1. HERO SECTION */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-slate-200 shadow-sm rounded-lg p-8">
            <h3 className="text-lg font-bold text-slate-900 mb-6 border-b border-slate-100 pb-4">1. Hero Section</h3>
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1 space-y-6">
                <div>
                  <div className="flex justify-between mb-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">Hero Title (H1)</label></div>
                  <Input type="text" value={heroTitle} onChange={(e) => setHeroTitle(e.target.value)} placeholder="e.g., Hire Expert Web Developers" className="bg-white border-slate-200 rounded-md focus-visible:ring-[#1A4484] text-sm h-11" />
                </div>
                <div>
                  <div className="flex justify-between mb-2"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block">Hero Description Paragraph</label></div>
                  <Textarea 
                    value={heroSubtitle} 
                    onChange={(e) => setHeroSubtitle(e.target.value)} 
                    placeholder="Get pre-vetted specialists well matched to your stack..."
                    className="bg-white border-slate-200 resize-none min-h-[120px] text-sm text-slate-600"
                  />
                </div>
              </div>
              <div className="w-full md:w-[40%]">
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Featured Image Layout Background</label>
                {!featuredImagePreview ? (
                  <div className="relative h-48 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center bg-slate-50 cursor-pointer mb-6 hover:bg-slate-100"><input type="file" onChange={handleFeaturedImageSelect} className="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" /><ImageIcon className="w-6 h-6 mb-2 text-slate-400" /><span className="text-sm font-semibold text-slate-600">Click to upload asset</span></div>
                ) : (
                  <div className="space-y-4 mb-6">
                    <img src={featuredImagePreview} className="w-full h-48 object-cover rounded-lg border border-slate-200" alt="Preview" />
                    {!featuredImageUrl && <button onClick={uploadFeaturedImage} type="button" className="w-full py-2.5 bg-yellow-400 font-bold rounded-md text-xs uppercase text-slate-900 shadow-sm">{isUploadingImage ? 'Uploading...' : 'Confirm Upload'}</button>}
                    <button onClick={clearFeaturedImage} type="button" className="w-full py-2.5 bg-slate-100 font-bold rounded-md text-xs uppercase text-slate-600 border border-slate-200">Remove Image</button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* 2. CAPABILITIES (PORTFOLIO BENTO GRID) SECTION */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white border border-slate-200 shadow-sm rounded-lg p-8">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">2. Capabilities (Bento Grid Workspace)</h3>
                <p className="text-xs text-slate-500 mt-1">Configure section headers and portfolio instances.</p>
              </div>
              <Button variant="outline" size="sm" onClick={addCapability} className="rounded-md flex gap-2 text-sm text-slate-700 hover:text-slate-900"><Plus className="w-4 h-4" /> Add Project Card</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Section Main Heading (Black)</label>
                <Input type="text" value={portfolioHeading} onChange={(e) => setPortfolioHeading(e.target.value)} className="bg-white border-slate-200 text-sm h-11 mb-4" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Section Subheading Context</label>
                <Textarea value={portfolioSubheading} onChange={(e) => setPortfolioSubheading(e.target.value)} className="bg-white border-slate-200 resize-none min-h-[114px] text-sm" />
              </div>
            </div>
            
            <div className="space-y-4">
               {capabilities.length === 0 && <div className="text-center py-8 text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-md">No portfolio cards added.</div>}
               {capabilities.map((cap, index) => (
                  <div key={index} className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-4 cursor-pointer flex justify-between items-center hover:bg-slate-50" onClick={() => setOpenCapabilityIndex(openCapabilityIndex === index ? null : index)}>
                      <span className="font-semibold text-sm text-slate-800">{cap.title || `Project Instance #${index + 1}`}</span>
                      <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeCapability(index); }} className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></Button>
                    </div>
                    {openCapabilityIndex === index && (
                      <div className="p-6 pt-0 border-t border-slate-100 space-y-6 mt-4 bg-slate-50/50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div><label className="text-xs font-semibold text-slate-600 block mb-2">Project Title</label><Input type="text" value={cap.title} onChange={(e) => updateCapability(index, 'title', e.target.value)} className="bg-white border-slate-200 text-sm" /></div>
                          <div><label className="text-xs font-semibold text-slate-600 block mb-2">Category Flag</label><Input type="text" value={cap.category} onChange={(e) => updateCapability(index, 'category', e.target.value)} className="bg-white border-slate-200 text-sm" /></div>
                        </div>
                        <div><label className="text-xs font-semibold text-slate-600 block mb-2">Card Body Description</label><Textarea value={cap.desc} onChange={(e) => updateCapability(index, 'desc', e.target.value)} className="bg-white border-slate-200 resize-none h-20 text-sm" /></div>
                        <div>
                          <label className="text-xs font-semibold text-slate-600 block mb-2">Select Target Vector Representation Icon</label>
                          <div className="flex flex-wrap gap-2 pt-2">
                            {AVAILABLE_ICONS.map((iObj) => (
                              <button key={iObj.name} type="button" onClick={() => updateCapability(index, 'icon', iObj.name)} className={`p-2.5 rounded-lg border flex items-center justify-center transition-all ${cap.icon === iObj.name ? 'bg-[#1A4484] text-white border-[#1A4484]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`} title={iObj.name}>{iObj.icon}</button>
                            ))}
                          </div>
                        </div>
                        <div className="pt-4 border-t border-slate-200">
                          <div className="flex items-center justify-between mb-4">
                            <label className="text-xs font-semibold text-slate-600">Tech Stack Logos / Badges Collection</label>
                            <Button type="button" variant="outline" size="sm" onClick={() => addLogoToCapability(index)} className="h-8 text-xs"><Plus className="w-3 h-3 mr-1" /> Add Stack Item</Button>
                          </div>
                          <div className="space-y-3">
                            {cap.logos && cap.logos.map((logo, lIndex) => (
                              <div key={lIndex} className="flex gap-3 items-center">
                                <Input type="text" placeholder="Tech Name (e.g., React)" value={logo.name} onChange={(e) => updateLogoInCapability(index, lIndex, 'name', e.target.value)} className="bg-white h-9 text-xs" />
                                <Input type="text" placeholder="Vector CDN Image URL" value={logo.url} onChange={(e) => updateLogoInCapability(index, lIndex, 'url', e.target.value)} className="bg-white h-9 text-xs" />
                                <Button type="button" variant="ghost" size="sm" onClick={() => removeLogoFromCapability(index, lIndex)} className="text-red-500 h-9 px-2"><Trash2 className="w-4 h-4" /></Button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
               ))}
            </div>
          </motion.div>

          {/* 3. BUSINESS CASE SECTION */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white border border-slate-200 shadow-sm rounded-lg p-8">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">3. Business Case Metrics</h3>
                <p className="text-xs text-slate-500 mt-1">Configure bottom line revenue justifications.</p>
              </div>
              <Button variant="outline" size="sm" onClick={addBusinessCase} className="rounded-md flex gap-2 text-sm text-slate-700 hover:text-slate-900"><Plus className="w-4 h-4" /> Add Metrics Card</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Badge Text Callout</label>
                <Input type="text" value={bcBadge} onChange={(e) => setBcBadge(e.target.value)} className="bg-white border-slate-200 text-sm mb-4" />
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Heading Prefix String</label>
                <Input type="text" value={bcHeadingPrefix} onChange={(e) => setBcHeadingPrefix(e.target.value)} className="bg-white border-slate-200 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Heading Highlight text</label>
                <Input type="text" value={bcHeadingHighlight} onChange={(e) => setBcHeadingHighlight(e.target.value)} className="bg-white border-slate-200 text-sm mb-4" />
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Subheading Paragraph Context</label>
                <Textarea value={bcSubheading} onChange={(e) => setBcSubheading(e.target.value)} className="bg-white border-slate-200 resize-none h-[42px] text-sm" />
              </div>
            </div>

            <div className="space-y-4">
               {businessCases.length === 0 && <div className="text-center py-8 text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-md">No metrics case blocks added.</div>}
               {businessCases.map((bc, index) => (
                 <div key={index} className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
                   <div className="p-4 cursor-pointer flex justify-between items-center hover:bg-slate-50" onClick={() => setOpenBcIndex(openBcIndex === index ? null : index)}>
                     <span className="font-semibold text-sm text-slate-800">{bc.title || `Metrics Parameter Block #${index + 1}`}</span>
                     <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeBusinessCase(index); }} className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></Button>
                   </div>
                   {openBcIndex === index && (
                     <div className="p-6 pt-0 border-t border-slate-100 space-y-6 mt-4 bg-slate-50/50">
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div><label className="text-xs font-semibold text-slate-600 block mb-2">Statistic Label (e.g., 0.05s / Security)</label><Input type="text" value={bc.stat} onChange={(e) => updateBusinessCase(index, 'stat', e.target.value)} className="bg-white border-slate-200 text-sm" /></div>
                       </div>
                       <div><label className="text-xs font-semibold text-slate-600 block mb-2">Reason Block Title</label><Input type="text" value={bc.title} onChange={(e) => updateBusinessCase(index, 'title', e.target.value)} className="bg-white border-slate-200 text-sm" /></div>
                       <div><label className="text-xs font-semibold text-slate-600 block mb-2">Reason Core Description</label><Textarea value={bc.desc} onChange={(e) => updateBusinessCase(index, 'desc', e.target.value)} className="bg-white border-slate-200 resize-none h-20 text-sm" /></div>
                       <div>
                         <label className="text-xs font-semibold text-slate-600 block mb-2">Looked-up Vector Core Icon</label>
                         <div className="flex flex-wrap gap-2 pt-2">
                           {AVAILABLE_ICONS.map((iObj) => (
                             <button key={iObj.name} type="button" onClick={() => updateBusinessCase(index, 'icon', iObj.name)} className={`p-2.5 rounded-lg border flex items-center justify-center transition-all ${bc.icon === iObj.name ? 'bg-[#1A4484] text-white border-[#1A4484]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`} title={iObj.name}>{iObj.icon}</button>
                           ))}
                         </div>
                       </div>
                     </div>
                   )}
                 </div>
               ))}
            </div>
          </motion.div>

          {/* 4. SERVICES SECTION */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="bg-white border border-slate-200 shadow-sm rounded-lg p-8">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">4. Services & Handoff Tasks</h3>
                <p className="text-xs text-slate-500 mt-1">Configure immediately handoff-able responsibilities.</p>
              </div>
              <Button variant="outline" size="sm" onClick={addService} className="rounded-md flex gap-2 text-sm text-slate-700 hover:text-slate-900"><Plus className="w-4 h-4" /> Add Service Item</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Section Badge Callout</label>
                <Input type="text" value={servicesBadge} onChange={(e) => setServicesBadge(e.target.value)} className="bg-white border-slate-200 text-sm mb-4" />
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Heading Prefix String</label>
                <Input type="text" value={servicesHeadingPrefix} onChange={(e) => setServicesHeadingPrefix(e.target.value)} className="bg-white border-slate-200 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Heading Highlight Text</label>
                <Input type="text" value={servicesHeadingHighlight} onChange={(e) => setServicesHeadingHighlight(e.target.value)} className="bg-white border-slate-200 text-sm mb-4" />
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Subheading Paragraph Context</label>
                <Textarea value={servicesSubheading} onChange={(e) => setServicesSubheading(e.target.value)} className="bg-white border-slate-200 resize-none h-[42px] text-sm" />
              </div>
            </div>

            <div className="space-y-4">
              {services.length === 0 && <div className="text-center py-8 text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-md">No service items added.</div>}
              {services.map((service, index) => (
                <div key={index} className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-4 cursor-pointer flex justify-between items-center hover:bg-slate-50" onClick={() => setOpenServiceIndex(openServiceIndex === index ? null : index)}>
                    <span className="font-semibold text-sm text-slate-800">{service.title || `Service Item #${index + 1}`}</span>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeService(index); }} className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  {openServiceIndex === index && (
                    <div className="p-6 pt-0 border-t border-slate-100 space-y-6 mt-4 bg-slate-50/50">
                      <div><label className="text-xs font-semibold text-slate-600 block mb-2">Service Title</label><Input type="text" value={service.title} onChange={(e) => updateService(index, 'title', e.target.value)} className="bg-white border-slate-200 text-sm" /></div>
                      <div><label className="text-xs font-semibold text-slate-600 block mb-2">Service Description</label><Textarea value={service.description} onChange={(e) => updateService(index, 'description', e.target.value)} className="bg-white border-slate-200 resize-none h-20 text-sm" /></div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-2">Looked-up Vector Core Icon</label>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {AVAILABLE_ICONS.map((iObj) => (
                            <button key={iObj.name} type="button" onClick={() => updateService(index, 'icon', iObj.name)} className={`p-2.5 rounded-lg border flex items-center justify-center transition-all ${service.icon === iObj.name ? 'bg-[#1A4484] text-white border-[#1A4484]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`} title={iObj.name}>{iObj.icon}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* 5. TECHNOLOGIES SECTION */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="bg-white border border-slate-200 shadow-sm rounded-lg p-8">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">5. Technologies Ecosystem Grid</h3>
                <p className="text-xs text-slate-500 mt-1">Configure language and workspace proficiencies.</p>
              </div>
              <Button variant="outline" size="sm" onClick={addTechCategory} className="rounded-md flex gap-2 text-sm text-slate-700 hover:text-slate-900"><Plus className="w-4 h-4" /> Add Tech Block</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Section Badge Text</label>
                <Input type="text" value={techBadge} onChange={(e) => setTechBadge(e.target.value)} className="bg-white border-slate-200 text-sm mb-4" />
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Heading Base Prefix</label>
                <Input type="text" value={techHeadingPrefix} onChange={(e) => setTechHeadingPrefix(e.target.value)} className="bg-white border-slate-200 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Heading End Highlight</label>
                <Input type="text" value={techHeadingHighlight} onChange={(e) => setTechHeadingHighlight(e.target.value)} className="bg-white border-slate-200 text-sm mb-4" />
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Section Subheading Paragraph</label>
                <Textarea value={techSubheading} onChange={(e) => setTechSubheading(e.target.value)} className="bg-white border-slate-200 resize-none h-[42px] text-sm" />
              </div>
            </div>

            <div className="space-y-4">
              {techCategories.length === 0 && <div className="text-center py-8 text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-md">No technical category clusters added.</div>}
              {techCategories.map((tech, index) => (
                <div key={index} className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-4 cursor-pointer flex justify-between items-center hover:bg-slate-50" onClick={() => setOpenTechIndex(openTechIndex === index ? null : index)}>
                    <span className="font-semibold text-sm text-slate-800">{tech.category || `Category Hub Block #${index + 1}`}</span>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeTechCategory(index); }} className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  {openTechIndex === index && (
                    <div className="p-6 pt-0 border-t border-slate-100 space-y-6 mt-4 bg-slate-50/50">
                      <div><label className="text-xs font-semibold text-slate-600 block mb-2">Category Label Group (e.g., Frontend / DevOps)</label><Input type="text" value={tech.category} onChange={(e) => updateTechCategory(index, 'category', e.target.value)} className="bg-white border-slate-200 text-sm" /></div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-2">Proficiency Keyword Tags (Comma Separated Strings)</label>
                        <Input type="text" placeholder="React, TypeScript, Next.js, Tailwind CSS" value={tech.tagsInput} onChange={(e) => updateTechCategory(index, 'tagsInput', e.target.value)} className="bg-white border-slate-200 text-sm" />
                        <span className="text-[10px] text-slate-400 block mt-1.5">Separate entry values cleanly with a standard comma symbol character.</span>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-2">Category Standard Vector representation Icon</label>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {AVAILABLE_ICONS.map((iObj) => (
                            <button key={iObj.name} type="button" onClick={() => updateTechCategory(index, 'icon', iObj.name)} className={`p-2.5 rounded-lg border flex items-center justify-center transition-all ${tech.icon === iObj.name ? 'bg-[#1A4484] text-white border-[#1A4484]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`} title={iObj.name}>{iObj.icon}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* 6. HOW IT WORKS SECTION */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="bg-white border border-slate-200 shadow-sm rounded-lg p-8">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">6. Onboarding Workflow Timeline</h3>
                <p className="text-xs text-slate-500 mt-1">Configure progressive onboarding execution steps.</p>
              </div>
              <Button variant="outline" size="sm" onClick={addHiwStep} className="rounded-md flex gap-2 text-sm text-slate-700 hover:text-slate-900"><Plus className="w-4 h-4" /> Add Delivery Step</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 p-6 bg-slate-50 border border-slate-200 rounded-lg">
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Timeline Section Badge</label>
                <Input type="text" value={hiwBadge} onChange={(e) => setHiwBadge(e.target.value)} className="bg-white border-slate-200 text-sm mb-4" />
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Heading Base Prefix String</label>
                <Input type="text" value={hiwHeadingPrefix} onChange={(e) => setHiwHeadingPrefix(e.target.value)} className="bg-white border-slate-200 text-sm" />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Heading Highlight string</label>
                <Input type="text" value={hiwHeadingHighlight} onChange={(e) => setHiwHeadingHighlight(e.target.value)} className="bg-white border-slate-200 text-sm" />
              </div>
            </div>

            <div className="space-y-4">
              {howItWorksSteps.length === 0 && <div className="text-center py-8 text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-md">No timeline execution instances added.</div>}
              {howItWorksSteps.map((step, index) => (
                <div key={index} className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-4 cursor-pointer flex justify-between items-center hover:bg-slate-50" onClick={() => setOpenHiwIndex(openHiwIndex === index ? null : index)}>
                    <span className="font-semibold text-sm text-slate-800">Step {step.num}: {step.title || 'Incomplete Configuration Header'}</span>
                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeHiwStep(index); }} className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                  {openHiwIndex === index && (
                    <div className="p-6 pt-0 border-t border-slate-100 space-y-6 mt-4 bg-slate-50/50">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label className="text-xs font-semibold text-slate-600 block mb-2">Step Title Header</label><Input type="text" value={step.title} onChange={(e) => updateHiwStep(index, 'title', e.target.value)} className="bg-white border-slate-200 text-sm" /></div>
                      </div>
                      <div><label className="text-xs font-semibold text-slate-600 block mb-2">Step Dynamic Description Context</label><Textarea value={step.desc} onChange={(e) => updateHiwStep(index, 'desc', e.target.value)} className="bg-white border-slate-200 resize-none h-20 text-sm" /></div>
                      <div>
                        <label className="text-xs font-semibold text-slate-600 block mb-2">Node Vector Display Icon</label>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {AVAILABLE_ICONS.map((iObj) => (
                            <button key={iObj.name} type="button" onClick={() => updateHiwStep(index, 'icon', iObj.name)} className={`p-2.5 rounded-lg border flex items-center justify-center transition-all ${step.icon === iObj.name ? 'bg-[#1A4484] text-white border-[#1A4484]' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'}`} title={iObj.name}>{iObj.icon}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>

          {/* 7. FAQ SECTION */}
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="bg-white border border-slate-200 shadow-sm rounded-lg p-8">
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4"><h3 className="text-lg font-bold text-slate-900">7. Contextual Accordion FAQs</h3><Button variant="outline" size="sm" onClick={addFAQ} className="rounded-md flex gap-2 text-sm text-slate-700 hover:text-slate-900"><Plus className="w-4 h-4" /> Add FAQ Accordion</Button></div>
            <div className="space-y-4">
               {faqs.length === 0 && <div className="text-center py-8 text-sm text-slate-500 bg-slate-50 border border-dashed border-slate-200 rounded-md">No dynamic FAQ query objects added.</div>}
               {faqs.map((faq, index) => (
                 <div key={index} className="bg-white rounded-md border border-slate-200 overflow-hidden shadow-sm">
                   <div className="p-4 cursor-pointer flex justify-between items-center hover:bg-slate-50" onClick={() => setOpenEditorFaqIndex(openEditorFaqIndex === index ? null : index)}>
                     <span className="font-semibold text-sm text-slate-800">{faq.question || `Query Header Prompt #${index + 1}`}</span>
                     <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); removeFAQ(index); }} className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-md"><Trash2 className="w-4 h-4" /></Button>
                   </div>
                   {openEditorFaqIndex === index && (
                     <div className="p-6 pt-0 border-t border-slate-100 space-y-4 mt-4 bg-slate-50/50">
                       <div><label className="text-xs font-semibold text-slate-600 block mb-2">Accordion Title Question String</label><Input type="text" value={faq.question} onChange={(e) => updateFAQ(index, 'question', e.target.value)} className="bg-white border-slate-200 text-sm" /></div>
                       <div><label className="text-xs font-semibold text-slate-600 block mb-2">Accordion Expanded Content Answer Context</label><Textarea value={faq.answer} onChange={(e) => updateFAQ(index, 'answer', e.target.value)} className="bg-white border-slate-200 resize-none h-24 text-sm" /></div>
                     </div>
                   )}
                 </div>
               ))}
            </div>
          </motion.div>

        </div>

        {/* --- RIGHT COLUMN: BLUEPRINT SIDEBAR --- */}
        <aside className="xl:col-span-4 space-y-6">
          <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 }} className="bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden sticky top-24">
            <button onClick={() => setOpenSidebarTab(openSidebarTab === 'seo' ? '' : 'seo')} className="w-full flex items-center justify-between p-6 text-sm font-bold text-slate-800 bg-slate-50 border-b border-slate-200">System Core Settings & SEO Rules Parameters<ChevronDown className={`w-4 h-4 text-slate-500 transform transition-transform ${openSidebarTab === 'seo' ? 'rotate-180' : ''}`} /></button>
            <AnimatePresence>
              {openSidebarTab === 'seo' && (
                <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }} className="overflow-hidden bg-white">
                  <div className="p-6 space-y-5">
                    <div>
                      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Internal Identity Name Label</label>
                      <select 
                        value={roleName} 
                        onChange={(e) => setRoleName(e.target.value)} 
                        className="flex w-full bg-white border border-slate-200 focus-visible:ring-2 focus-visible:ring-[#1A4484] focus-visible:outline-none text-sm h-10 rounded-md px-3"
                      >
                        <option value="" disabled>Select a role...</option>
                        <option value="Graphic Designer">Graphic Designer</option>
                        <option value="Video Editor">Video Editor</option>
                        <option value="Legal Professional">Legal Professional</option>
                        <option value="Web Developer">Web Developer</option>
                        <option value="Accounts Executive">Accounts Executive</option>
                        <option value="UI Designer">UI Designer</option>
                        <option value="SEO Expert">SEO Expert</option>
                        <option value="Performance Marketer">Performance Marketer</option>
                        <option value="Executive Assistant">Executive Assistant</option>
                        <option value="Creative Strategist">Creative Strategist</option>
                        <option value="Copywriter">Copywriter</option>
                        <option value="Blog Writer">Blog Writer</option>
                        <option value="Marketing Strategist">Marketing Strategist</option>
                        <option value="Legal Strategiest">Legal Strategiest</option>
                        <option value="Recruitment VA">Recruitment VA</option>
                        <option value="Content Strategist">Content Strategist</option>
                        <option value="Brand Strategiest">Brand Strategiest</option>
                      </select>
                    </div>
                    <div className="pt-5 border-t border-slate-100"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Custom Router Routing Slug (URL Parameter)</label><Input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g., hire-nodejs-developer" className="bg-white border-slate-200 text-sm rounded-md" /></div>
                    <div className="pt-5 border-t border-slate-100"><label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Meta Document Title</label><Input type="text" value={metaTitle} onChange={(e) => setMetaTitle(e.target.value)} placeholder="Target SEO Page Title Tag..." className="bg-white border-slate-200 text-sm rounded-md" /></div>
                    <div><label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Meta Content Description</label><Textarea value={metaDescription} onChange={(e) => setMetaDescription(e.target.value)} rows={4} placeholder="Target Meta Page Description Tag..." className="bg-white border-slate-200 resize-none text-sm rounded-md" /></div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </aside>

      </div>
    </div>
  );
};

// ==========================================
// MAIN MANAGE ROLES COMPONENT
// ==========================================
const ManageRoles = () => {
  const navigate = useNavigate();
  const [roles, setRoles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // --- Quick Edit Popup States ---
  const [popupRole, setPopupRole] = useState(null);
  const [quickRoleName, setQuickRoleName] = useState('');
  const [quickSlug, setQuickSlug] = useState('');
  const [quickMetaTitle, setQuickMetaTitle] = useState('');
  const [quickMetaDescription, setQuickMetaDescription] = useState('');
  const [isSavingQuickEdit, setIsSavingQuickEdit] = useState(false);

  // --- Full Edit Modal State ---
  const [fullEditRoleId, setFullEditRoleId] = useState(null);

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      setIsLoading(true);
      const endpoint = SERVER_URL.endsWith('/api') ? '/roles' : '/api/roles';
      const res = await axios.get(`${SERVER_URL}${endpoint}`);
      setRoles(res.data);
    } catch (err) {
      console.error("Failed to fetch roles:", err);
      alert("Error loading roles. Please check your console.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id, roleName) => {
    const isConfirmed = window.confirm(`Are you sure you want to delete the role "${roleName}"? This action cannot be undone.`);
    if (!isConfirmed) return;

    try {
      const endpoint = SERVER_URL.endsWith('/api') ? `/roles/${id}` : `/api/roles/${id}`;
      await axios.delete(`${SERVER_URL}${endpoint}`);
      setRoles(roles.filter(role => role._id !== id));
    } catch (err) {
      console.error("Deletion failed:", err);
      alert("Failed to delete the role. " + (err.response?.data?.error || err.message));
    }
  };

  // --- Quick Edit Handlers ---
  const handleOpenPopup = (role) => {
    setPopupRole(role);
    setQuickRoleName(role.roleName || '');
    setQuickSlug(role.slug || '');
    setQuickMetaTitle(role.seo?.metaTitle || '');
    setQuickMetaDescription(role.seo?.metaDescription || '');
  };

  const closePopup = () => {
    setPopupRole(null);
    setQuickRoleName('');
    setQuickSlug('');
    setQuickMetaTitle('');
    setQuickMetaDescription('');
  };

  const handleQuickSave = async () => {
    if (!quickRoleName.trim()) return alert("Please select a Role Name.");
    if (!quickSlug.trim()) return alert("URL Slug cannot be empty.");

    try {
      setIsSavingQuickEdit(true);
      
      const updatedPayload = {
        ...popupRole, 
        roleName: quickRoleName.trim(),
        slug: quickSlug.trim(),
        seo: {
          metaTitle: quickMetaTitle.trim(),
          metaDescription: quickMetaDescription.trim()
        }
      };

      const endpoint = SERVER_URL.endsWith('/api') ? `/roles/${popupRole._id}` : `/api/roles/${popupRole._id}`;
      await axios.put(`${SERVER_URL}${endpoint}`, updatedPayload);
      
      alert("SEO & Basic details updated successfully!");
      fetchRoles();
      closePopup();
    } catch (err) {
      console.error("Error saving quick edit", err);
      alert("Failed to save changes. " + (err.response?.data?.error || err.message));
    } finally {
      setIsSavingQuickEdit(false);
    }
  };

  // Filter roles based on search input
  const filteredRoles = roles.filter(role => 
    role.roleName.toLowerCase().includes(searchQuery.toLowerCase()) || 
    role.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen font-sans text-slate-900 bg-[#f8fafc] overflow-x-hidden pb-20">
      <Header />

      {/* Render the full-screen edit modal if an ID is set */}
      <AnimatePresence>
        {fullEditRoleId && (
          <FullEditModal 
            roleId={fullEditRoleId} 
            onClose={() => setFullEditRoleId(null)} 
            onSuccess={() => { setFullEditRoleId(null); fetchRoles(); }}
          />
        )}
      </AnimatePresence>

      {/* --- QUICK EDIT POPUP MODAL --- */}
      <AnimatePresence>
        {popupRole && !fullEditRoleId && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] border border-slate-200"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 shrink-0">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2"><Zap className="w-4 h-4 text-amber-500" /> Quick Edit SEO & Routing</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Modify top-level identifiers without loading the full architecture editor.</p>
                </div>
                <button onClick={closePopup} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-200 text-slate-500 hover:bg-slate-300 transition-colors">✕</button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Internal Role Name</label>
                    <select 
                      value={quickRoleName} 
                      onChange={(e) => setQuickRoleName(e.target.value)} 
                      className="flex w-full bg-slate-50 border border-slate-200 focus-visible:ring-2 focus-visible:ring-[#1A4484] focus-visible:outline-none text-sm h-11 rounded-md px-3"
                    >
                      <option value="" disabled>Select a role...</option>
                      <option value="Graphic Designer">Graphic Designer</option>
                      <option value="Video Editor">Video Editor</option>
                      <option value="Legal Professional">Legal Professional</option>
                      <option value="Web Developer">Web Developer</option>
                      <option value="Accounts Executive">Accounts Executive</option>
                      <option value="UI Designer">UI Designer</option>
                      <option value="SEO Expert">SEO Expert</option>
                      <option value="Performance Marketer">Performance Marketer</option>
                      <option value="Executive Assistant">Executive Assistant</option>
                      <option value="Creative Strategist">Creative Strategist</option>
                      <option value="Copywriter">Copywriter</option>
                      <option value="Blog Writer">Blog Writer</option>
                      <option value="Marketing Strategist">Marketing Strategist</option>
                      <option value="Legal Strategiest">Legal Strategiest</option>
                      <option value="Recruitment VA">Recruitment VA</option>
                      <option value="Content Strategist">Content Strategist</option>
                      <option value="Brand Strategiest">Brand Strategiest</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">URL Routing Slug</label>
                    <Input 
                      value={quickSlug} 
                      onChange={(e) => setQuickSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, '-'))} 
                      className="bg-slate-50 border-slate-200 focus-visible:ring-[#1A4484] text-sm h-11" 
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Meta Title (SEO)</label>
                    <Input 
                      value={quickMetaTitle} 
                      onChange={(e) => setQuickMetaTitle(e.target.value)} 
                      placeholder="Target page title tag..."
                      className="bg-slate-50 border-slate-200 focus-visible:ring-[#1A4484] text-sm h-11" 
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider block mb-2">Meta Description (SEO)</label>
                    <textarea 
                      value={quickMetaDescription} 
                      onChange={(e) => setQuickMetaDescription(e.target.value)} 
                      placeholder="Target page description tag..."
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:ring-2 focus:ring-[#1A4484]/20 focus:border-[#1A4484] resize-none" 
                    />
                  </div>
                </div>
              </div>

              <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                <Button variant="outline" onClick={closePopup} className="px-6 border-slate-200 text-slate-600">Cancel</Button>
                <Button 
                  onClick={handleQuickSave} 
                  disabled={isSavingQuickEdit} 
                  className="bg-[#1A4484] hover:bg-[#112d5e] text-white px-8 shadow-sm"
                >
                  {isSavingQuickEdit ? 'Saving...' : 'Save Quick Edits'}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* --- MAIN PAGE CONTENT --- */}
      <div className={`max-w-[1400px] mx-auto px-6 py-8 relative z-10 ${fullEditRoleId ? 'hidden' : 'block'}`}>
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-8 border-b border-slate-200 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Role Archive</h1>
            <p className="text-slate-500 text-sm mt-1">Manage, update, and configure your dynamic service hiring pages.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" />
              <Input 
                type="text" 
                placeholder="Search roles..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-white border-slate-200 focus-visible:ring-[#1A4484] text-sm h-10 w-full rounded-lg"
              />
            </div>
            <Button 
              onClick={() => navigate('/create-role')} 
              className="bg-[#1A4484] hover:bg-slate-900 text-white rounded-lg text-sm font-medium px-5 py-2.5 transition-colors shadow-sm shrink-0"
            >
              <Plus className="w-4 h-4 mr-1" /> Create Role
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-20 text-slate-500 text-sm font-medium flex flex-col items-center">
            <Loader2 className="w-8 h-8 animate-spin text-[#1A4484] mb-3" />
            Loading architecture layouts...
          </div>
        ) : filteredRoles.length === 0 ? (
          <div className="text-center py-24 bg-white border border-slate-200 rounded-2xl shadow-sm">
            <LayoutTemplate className="w-12 h-12 mx-auto mb-3 text-slate-300" />
            <h3 className="text-lg font-semibold text-slate-700">No roles found</h3>
            <p className="text-slate-500 text-sm mt-1">Adjust your search or create a new role to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            <AnimatePresence>
              {filteredRoles.map((role, index) => {
                const coverImage = role.pageData?.hero?.backgroundImage;
                
                return (
                  <motion.div 
                    key={role._id} 
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ delay: index * 0.05 }}
                    className="bg-white border border-slate-200 shadow-sm hover:shadow-md rounded-2xl p-4 flex flex-col transition-all group"
                  >
                    {/* Image Thumbnail */}
                    {coverImage ? (
                      <div className="relative w-full h-40 mb-4 rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                        <img src={coverImage} alt={role.roleName} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    ) : (
                      <div className="w-full h-40 bg-slate-50 rounded-xl mb-4 flex flex-col items-center justify-center text-slate-400 border border-slate-100">
                        <LayoutTemplate className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs font-medium">No Cover Asset</span>
                      </div>
                    )}
                    
                    {/* Core Info */}
                    <h2 className="text-lg font-bold text-slate-800 mb-1 line-clamp-1">
                      {role.roleName}
                    </h2>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-1">
                      {role.seo?.metaTitle || 'No SEO Title Configured'}
                    </p>
                    
                    {/* Tags / Meta */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[11px] font-semibold rounded-md border border-slate-200 flex items-center">
                        /{role.slug}
                      </span>
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 text-[11px] font-semibold rounded-md border border-blue-100">
                        {new Date(role.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    </div>
                    
                    {/* Action Buttons Grid */}
                    <div className="mt-auto grid grid-cols-2 gap-2 pt-4 border-t border-slate-100">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleOpenPopup(role)}
                        className="w-full text-xs h-8 bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100 hover:text-amber-800"
                      >
                        <Zap className="w-3.5 h-3.5 mr-1.5" /> Quick SEO
                      </Button>
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFullEditRoleId(role._id)}
                        className="w-full text-xs h-8 bg-blue-50 text-[#1A4484] border-blue-200 hover:bg-blue-100 hover:text-[#112d5e]"
                      >
                        <Settings className="w-3.5 h-3.5 mr-1.5" /> Full Edit
                      </Button>
                    </div>

                    {/* Secondary Actions Row */}
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Link to={`https://manhoursonhire.com/role/${role.slug}`} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button variant="ghost" size="sm" className="w-full text-xs h-8 text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100">
                          <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> View Live
                        </Button>
                      </Link>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(role._id, role.roleName)}
                        className="w-full text-xs h-8 text-slate-500 hover:text-red-600 bg-slate-50 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Delete
                      </Button>
                    </div>

                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
};

export default ManageRoles;