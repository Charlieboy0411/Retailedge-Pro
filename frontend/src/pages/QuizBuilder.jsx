import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { 
  Plus, Trash2, Settings, Save, List, Eye, Sparkles, AlertCircle, 
  Upload, CheckCircle, ChevronDown, Check, X, ShieldAlert, Laptop, 
  Smartphone, Tablet, Play, Award, HelpCircle, FileText, Image as ImageIcon,
  MoreHorizontal, Copy
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

export default function QuizBuilder() {
  const { token } = useContext(AuthContext);
  const { quizId } = useParams();
  const navigate = useNavigate();
  
  // Quiz basic details
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [projects, setProjects] = useState([]);
  
  // Stepper state: 'details' | 'questions' | 'settings'
  const [activeStep, setActiveStep] = useState('details');

  // Advanced settings config
  const [config, setConfig] = useState({
    category: 'Product Knowledge',
    difficulty: 'Intermediate',
    passing_score: 50,
    time_limit: 'No Limit',
    randomize_questions: false,
    randomize_answers: false,
    show_results: true,
    show_leaderboard: true,
    certification_trigger: false,
    negative_marking: false
  });

  // Question list
  const [questions, setQuestions] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);

  // Modals
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewDevice, setPreviewDevice] = useState('desktop'); // desktop | tablet | mobile
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  
  // AI Generator Form
  const [aiInputText, setAiInputText] = useState('');
  const [aiSourceType, setAiSourceType] = useState('PDF'); // PDF | PPT | Video Transcript
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiUploadFile, setAiUploadFile] = useState(null);
  
  // Bulk upload files
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkValidateErrors, setBulkValidateErrors] = useState([]);

  // Preview simulator state
  const [previewProgress, setPreviewProgress] = useState('welcome'); // welcome | quiz | results
  const [previewQIndex, setPreviewQIndex] = useState(0);
  const [previewAnswers, setPreviewAnswers] = useState({}); // { qId: selectedOptionOrText }
  const [previewScore, setPreviewScore] = useState(0);

  useEffect(() => {
    fetchProjects();
  }, [token]);

  useEffect(() => {
    if (quizId) {
      fetchQuizDetails();
    }
  }, [quizId, token]);

  const fetchQuizDetails = async () => {
    try {
      const response = await axios.get(`/api/quizzes/${quizId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const q = response.data;
      setTitle(q.title || '');
      setDescription(q.description || '');
      setProjectId(q.projectId || '');
      
      const loadedConfig = q.config || {};
      setConfig({
        category: loadedConfig.category || 'Product Knowledge',
        difficulty: loadedConfig.difficulty || 'Intermediate',
        passing_score: loadedConfig.passing_score !== undefined ? loadedConfig.passing_score : 50,
        time_limit: loadedConfig.time_limit !== undefined ? loadedConfig.time_limit : 'No Limit',
        randomize_questions: !!loadedConfig.randomize_questions,
        randomize_answers: !!loadedConfig.randomize_answers,
        show_results: loadedConfig.show_results !== undefined ? !!loadedConfig.show_results : true,
        show_leaderboard: loadedConfig.show_leaderboard !== undefined ? !!loadedConfig.show_leaderboard : true,
        certification_trigger: !!loadedConfig.certification_trigger,
        negative_marking: !!loadedConfig.negative_marking
      });

      if (q.questions && q.questions.length > 0) {
        const loadedQs = q.questions.map(question => {
          let correct = question.correct_answer;
          if (question.type === 'multi_select') {
            if (typeof correct === 'string') {
              try { correct = JSON.parse(correct); }
              catch (e) { correct = correct.split(',').map(s => s.trim()); }
            }
          }
          let opts = question.options;
          if (typeof opts === 'string') {
            try { opts = JSON.parse(opts); } catch (e) { opts = []; }
          }
          return {
            id: question.id,
            type: question.type,
            text: question.text,
            options: opts || [],
            correct_answer: correct,
            time_limit: question.time_limit !== undefined ? question.time_limit : 30,
            points: question.points !== undefined ? question.points : 1,
            media_url: question.media_url || '',
            difficulty: question.difficulty || 'Medium'
          };
        });
        setQuestions(loadedQs);
        setActiveQuestionId(loadedQs[0]?.id || null);
      }
    } catch (error) {
      console.error('Failed to fetch quiz details', error);
      alert('Failed to load quiz details for editing.');
    }
  };

  const fetchProjects = async () => {
    try {
      const response = await axios.get('/api/projects', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (error) {
      console.error('Failed to fetch projects', error);
    }
  };

  // Stepper Wizards fields renderer helper
  const handleNextStep = () => {
    if (activeStep === 'details') setActiveStep('questions');
    else if (activeStep === 'questions') setActiveStep('settings');
  };

  const handlePrevStep = () => {
    if (activeStep === 'questions') setActiveStep('details');
    else if (activeStep === 'settings') setActiveStep('questions');
  };

  // Add a new question to workspace
  const addQuestion = (type) => {
    const newQ = {
      id: Date.now().toString(), // temporary frontend ID
      type: type,
      text: '',
      options: type === 'true_false' 
        ? ['True', 'False'] 
        : (['mcq', 'multi_select', 'poll'].includes(type) ? ['', '', '', ''] : []),
      correct_answer: type === 'true_false' ? 'True' : '',
      time_limit: 30,
      points: 1,
      media_url: '',
      difficulty: 'Medium'
    };
    setQuestions([...questions, newQ]);
    setActiveQuestionId(newQ.id);
    setActiveStep('questions'); // ensure we go to questions view
  };

  const updateActiveQuestion = (field, value) => {
    setQuestions(prevQuestions => prevQuestions.map(q => 
      q.id === activeQuestionId ? { ...q, [field]: value } : q
    ));
  };

  const updateActiveQuestionFields = (fieldsObj) => {
    setQuestions(prevQuestions => prevQuestions.map(q => 
      q.id === activeQuestionId ? { ...q, ...fieldsObj } : q
    ));
  };

  const updateOption = (index, value) => {
    setQuestions(prevQuestions => prevQuestions.map(q => {
      if (q.id !== activeQuestionId) return q;
      const newOptions = [...(q.options || [])];
      newOptions[index] = value;
      return { ...q, options: newOptions };
    }));
  };

  const addOption = () => {
    setQuestions(prevQuestions => prevQuestions.map(q => {
      if (q.id !== activeQuestionId) return q;
      return { ...q, options: [...(q.options || []), ''] };
    }));
  };

  const removeOption = (index) => {
    setQuestions(prevQuestions => prevQuestions.map(q => {
      if (q.id !== activeQuestionId) return q;
      const newOptions = (q.options || []).filter((_, i) => i !== index);
      return { ...q, options: newOptions };
    }));
  };

  const deleteQuestion = (id) => {
    setQuestions(questions.filter(q => q.id !== id));
    if (activeQuestionId === id) {
      const remaining = questions.filter(q => q.id !== id);
      setActiveQuestionId(remaining[0]?.id || null);
    }
  };

  const duplicateQuestion = (q) => {
    const dupe = {
      ...q,
      id: Date.now().toString(),
      text: `${q.text} (Copy)`
    };
    const idx = questions.findIndex(item => item.id === q.id);
    const updated = [...questions];
    updated.splice(idx + 1, 0, dupe);
    setQuestions(updated);
    setActiveQuestionId(dupe.id);
  };

  const handleDownloadCsvTemplate = (e) => {
    e.preventDefault();
    const csvContent = "type,text,option1,option2,option3,option4,correct_answer\n" +
      "mcq,What is brand compliance?,Consistent logo use,Flexible colors,No rules,Any fonts,Consistent logo use\n" +
      "true_false,Operational guidelines apply to all stores.,True,False,,,True\n" +
      "open_text,Name the primary brand color.,,,,,Orange\n";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "quizhive_csv_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleDownloadJsonTemplate = (e) => {
    e.preventDefault();
    const jsonContent = [
      {
        type: "mcq",
        text: "What is standard brand compliance?",
        options: [
          "Logo sizing under 30px",
          "Consistent hex values matching brand system",
          "Unregulated typography scales",
          "Monochrome imagery only"
        ],
        correct_answer: "Consistent hex values matching brand system"
      },
      {
        type: "true_false",
        text: "Operational guidelines apply to all stores.",
        options: ["True", "False"],
        correct_answer: "True"
      },
      {
        type: "open_text",
        text: "Explain the main color guideline.",
        options: [],
        correct_answer: "customer trust, brand identity"
      }
    ];
    const blob = new Blob([JSON.stringify(jsonContent, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "quizhive_json_template.json");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Form validations & Saving Quiz
  const handleSaveQuiz = async () => {
    if (!title.trim()) {
      alert('Please provide a Quiz Title');
      return;
    }
    if (questions.length === 0) {
      alert('Please add at least one question.');
      return;
    }

    const emptyQuestion = questions.find(q => !q.text || !q.text.trim());
    if (emptyQuestion) {
      const idx = questions.indexOf(emptyQuestion) + 1;
      alert(`Question ${idx} has no text. Please fill in all question fields before saving.`);
      setActiveQuestionId(emptyQuestion.id);
      setActiveStep('questions');
      return;
    }

    // Prepare questions for backend
    const payloadQuestions = questions.map(q => {
      let correct = q.correct_answer;
      if (Array.isArray(correct)) {
        correct = JSON.stringify(correct);
      }
      return {
        type: q.type,
        text: q.text,
        options: q.options,
        correct_answer: correct,
        time_limit: q.time_limit !== undefined ? q.time_limit : 30,
        points: q.points !== undefined ? q.points : 1,
        media_url: q.media_url || '',
        difficulty: q.difficulty || 'Medium'
      };
    });

    try {
      if (quizId) {
        await axios.put(`/api/quizzes/${quizId}`, {
          title,
          description,
          config,
          projectId: projectId || null,
          questions: payloadQuestions
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Quiz updated successfully!');
      } else {
        await axios.post('/api/quizzes', {
          title,
          description,
          config,
          projectId: projectId || null,
          questions: payloadQuestions
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
        alert('Quiz created successfully!');
      }
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to save quiz', error);
      const serverMsg = error.response?.data?.details || error.response?.data?.error || error.message;
      alert(`Failed to save quiz.\n\nReason: ${serverMsg}`);
    }
  };

  const getQuestionTypeLabel = (type) => {
    switch (type) {
      case 'mcq': return 'Multiple Choice';
      case 'multi_select': return 'Multi-Select MCQ';
      case 'true_false': return 'True / False';
      case 'open_text': return 'Open Text';
      case 'rating': return 'Rating Poll';
      case 'poll': return 'Standard Poll';
      case 'word_cloud': return 'Word Cloud';
      case 'match': return 'Match the Following';
      case 'sequence': return 'Sequence Question';
      default: return type;
    }
  };

  // Question completeness validation helper
  const getQuestionStatus = (q) => {
    if (!q) return 'draft';
    if (!q.text || !q.text.trim()) return 'draft'; // Orange
    if (q.type === 'open_text' || q.type === 'word_cloud' || q.type === 'rating') {
      return 'completed'; // Green (polls/text questions require no option validation)
    }
    // Multiple Options Questions
    if (!q.options || !Array.isArray(q.options) || q.options.some(opt => !opt || !opt.trim())) return 'draft'; // Orange
    
    // Check correct answer selected
    if (q.type === 'multi_select') {
      const answers = Array.isArray(q.correct_answer) ? q.correct_answer : [];
      if (answers.length === 0) return 'missing_answer'; // Red
    } else {
      if (!q.correct_answer || !String(q.correct_answer).trim()) return 'missing_answer'; // Red
    }

    return 'completed';
  };

  const activeQuestion = questions.find(q => q.id === activeQuestionId);

  // AI Generator Simulator
  const handleGenerateWithAi = () => {
    if (!aiInputText.trim()) {
      alert("Please upload a file, transcribe a video, or describe what questions you want to generate.");
      return;
    }
    setAiGenerating(true);
    setTimeout(() => {
      // Simulate generating 3 questions
      const generated = [
        {
          id: `ai-1-${Date.now()}`,
          type: 'mcq',
          text: `Based on the ${aiSourceType} content, what is the core requirement for standard brand compliance?`,
          options: ['Logo sizing under 30px', 'Consistent hex values matching brand system', 'Unregulated typography scales', 'Monochrome imagery only'],
          correct_answer: 'Consistent hex values matching brand system',
          time_limit: 30,
          points: 5,
          media_url: '',
          difficulty: 'Medium'
        },
        {
          id: `ai-2-${Date.now()}`,
          type: 'true_false',
          text: `True or False: Standard compliance regulations apply to all regional campaigns without exceptions.`,
          options: ['True', 'False'],
          correct_answer: 'True',
          time_limit: 15,
          points: 2,
          media_url: '',
          difficulty: 'Easy'
        },
        {
          id: `ai-3-${Date.now()}`,
          type: 'open_text',
          text: `Explain what negative outcomes are expected if brand guideline colors are shifted.`,
          options: [],
          correct_answer: 'customer trust drop, brand dilution',
          time_limit: 60,
          points: 10,
          media_url: '',
          difficulty: 'Hard'
        }
      ];

      setQuestions([...questions, ...generated]);
      setActiveQuestionId(generated[0].id);
      setAiGenerating(false);
      setIsAiModalOpen(false);
      setAiInputText('');
      alert("Successfully generated and inserted 3 questions using AI!");
    }, 2000);
  };

  // Bulk Upload questions parser simulator
  const handleBulkUploadParse = () => {
    if (!bulkFile) {
      alert("Please select a file to upload.");
      return;
    }
    
    // Simulate validation
    setTimeout(async () => {
      try {
        const text = await bulkFile.text();
        if (bulkFile.name.endsWith('.json')) {
          const parsed = JSON.parse(text);
          if (Array.isArray(parsed)) {
            const list = parsed.map((item, idx) => ({
              id: `bulk-${idx}-${Date.now()}`,
              type: item.type || 'mcq',
              text: item.text || `Bulk question ${idx + 1}`,
              options: Array.isArray(item.options) ? item.options : ['Option 1', 'Option 2'],
              correct_answer: item.correct_answer || '',
              time_limit: parseInt(item.time_limit) || 30,
              points: parseInt(item.points) || 1,
              media_url: item.media_url || '',
              difficulty: item.difficulty || 'Medium'
            }));
            setQuestions([...questions, ...list]);
            setActiveQuestionId(list[0]?.id || null);
            setIsBulkModalOpen(false);
            setBulkFile(null);
            alert(`Successfully imported ${list.length} questions from JSON!`);
          } else {
            setBulkValidateErrors(["JSON file must be an array of questions."]);
          }
        } else {
          // Parse CSV
          const rows = text.split('\n').filter(r => r.trim().length > 0);
          if (rows.length < 2) {
            setBulkValidateErrors(["CSV has no data rows."]);
            return;
          }
          const list = [];
          for (let i = 1; i < rows.length; i++) {
            const cols = rows[i].split(',');
            list.push({
              id: `bulk-csv-${i}-${Date.now()}`,
              type: cols[0]?.trim() || 'mcq',
              text: cols[1]?.trim() || 'Untitled Question',
              options: [cols[2], cols[3], cols[4], cols[5]].filter(Boolean).map(o => o.trim()),
              correct_answer: cols[6]?.trim() || '',
              time_limit: 30,
              points: 1,
              media_url: '',
              difficulty: 'Medium'
            });
          }
          setQuestions([...questions, ...list]);
          setActiveQuestionId(list[0]?.id || null);
          setIsBulkModalOpen(false);
          setBulkFile(null);
          alert(`Successfully imported ${list.length} questions from CSV!`);
        }
      } catch (err) {
        setBulkValidateErrors([`Failed to parse file: ${err.message}`]);
      }
    }, 1000);
  };

  // Preview Mode Handlers
  const handleOpenPreview = () => {
    if (questions.length === 0) {
      alert("Please add at least one question to preview.");
      return;
    }
    setPreviewProgress('welcome');
    setPreviewQIndex(0);
    setPreviewAnswers({});
    setPreviewScore(0);
    setIsPreviewOpen(true);
  };

  const handleStartQuizPreview = () => {
    setPreviewProgress('quiz');
  };

  const handlePreviewAnswerSelect = (optionValue) => {
    const activeQ = questions[previewQIndex];
    setPreviewAnswers({
      ...previewAnswers,
      [activeQ.id]: optionValue
    });
  };

  const handlePreviewNext = () => {
    const activeQ = questions[previewQIndex];
    const selected = previewAnswers[activeQ.id];
    let scoreGained = 0;
    
    // Check if correct
    if (activeQ.type === 'multi_select') {
      let correctArr = Array.isArray(activeQ.correct_answer) ? activeQ.correct_answer : [];
      let selectedArr = Array.isArray(selected) ? selected : [];
      const isMatch = correctArr.length === selectedArr.length && 
        [...correctArr].sort().every((val, index) => val === [...selectedArr].sort()[index]);
      if (isMatch) scoreGained = activeQ.points;
    } else {
      if (selected && String(selected).trim().toLowerCase() === String(activeQ.correct_answer).trim().toLowerCase()) {
        scoreGained = activeQ.points;
      }
    }

    setPreviewScore(prev => prev + scoreGained);

    if (previewQIndex < questions.length - 1) {
      setPreviewQIndex(prev => prev + 1);
    } else {
      setPreviewProgress('results');
    }
  };

  // Statistics counters
  const totalQuestions = questions.length;
  const totalPoints = questions.reduce((sum, q) => sum + (parseInt(q.points) || 1), 0);
  const estimatedTime = questions.reduce((sum, q) => sum + (parseInt(q.time_limit) || 30), 0);
  const easyCount = questions.filter(q => q.difficulty === 'Easy').length;
  const mediumCount = questions.filter(q => q.difficulty === 'Medium').length;
  const hardCount = questions.filter(q => q.difficulty === 'Hard').length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', fontFamily: 'Poppins, sans-serif' }}>
      
      {/* ─── HEADER BAR ─── */}
      <div className="section-header" style={{ flexShrink: 0, paddingBottom: '16px', borderBottom: '1px solid #E2E8F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="section-title" style={{ fontWeight: 800, color: '#071B36', fontSize: '1.6rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Quiz Builder <span style={{ textShadow: '0 0 8px rgba(243,111,33,0.3)' }}>✨</span>
          </h2>
          <p className="section-desc" style={{ color: '#64748B', fontSize: '0.88rem' }}>Create engaging quizzes for effective learning</p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={handleOpenPreview}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 16px', borderRadius: '10px', fontSize: '0.88rem', fontWeight: 600, background: '#FFFFFF', border: '1px solid #E2E8F0' }}
          >
            <Eye size={16} color="#64748B" /> Preview Quiz
          </button>
          
          <div style={{ display: 'flex', background: 'linear-gradient(135deg, #F36F21 0%, #E05A0E 100%)', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 4px 12px rgba(243,111,33,0.25)' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleSaveQuiz}
              style={{ border: 'none', background: 'transparent', padding: '10px 18px', color: 'white', fontWeight: 600, fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Save size={16} /> Save & Publish
            </button>
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.2)', margin: '8px 0' }} />
            <button 
              onClick={() => alert("Quiz saved as Draft successfully!")}
              style={{ border: 'none', background: 'transparent', padding: '0 12px', color: 'white', cursor: 'pointer' }}
              title="Save Draft"
            >
              <ChevronDown size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ─── THREE-COLUMN WORKSPACE ─── */}
      <div style={{ display: 'flex', gap: '20px', flex: 1, overflow: 'hidden', width: '100%', boxSizing: 'border-box' }}>
        
        {/* Column 1: Quiz Details / Settings Panel (Width 30%) */}
        <div className="glass-card" style={{ width: '300px', flexShrink: 0, display: 'flex', flexDirection: 'column', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px', overflowY: 'auto' }}>
          
          {/* Stepper wizard navigation */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', position: 'relative' }}>
            
            {/* Step 1 indicator */}
            <div 
              onClick={() => setActiveStep('details')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', zIndex: 10, flex: 1 }}
            >
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                background: activeStep === 'details' ? '#FFF5F0' : '#F8FAFC', 
                border: `2px solid ${activeStep === 'details' ? '#F36F21' : '#E2E8F0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                color: activeStep === 'details' ? '#F36F21' : '#94A3B8', fontWeight: 700, fontSize: '0.85rem' 
              }}>
                1
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: activeStep === 'details' ? '#F36F21' : '#94A3B8', marginTop: '6px' }}>Details</span>
            </div>

            {/* Step 2 indicator */}
            <div 
              onClick={() => setActiveStep('questions')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', zIndex: 10, flex: 1 }}
            >
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                background: activeStep === 'questions' ? '#FFF5F0' : '#F8FAFC', 
                border: `2px solid ${activeStep === 'questions' ? '#F36F21' : '#E2E8F0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                color: activeStep === 'questions' ? '#F36F21' : '#94A3B8', fontWeight: 700, fontSize: '0.85rem' 
              }}>
                2
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: activeStep === 'questions' ? '#F36F21' : '#94A3B8', marginTop: '6px' }}>Questions</span>
            </div>

            {/* Step 3 indicator */}
            <div 
              onClick={() => setActiveStep('settings')}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', zIndex: 10, flex: 1 }}
            >
              <div style={{ 
                width: '32px', height: '32px', borderRadius: '50%', 
                background: activeStep === 'settings' ? '#FFF5F0' : '#F8FAFC', 
                border: `2px solid ${activeStep === 'settings' ? '#F36F21' : '#E2E8F0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                color: activeStep === 'settings' ? '#F36F21' : '#94A3B8', fontWeight: 700, fontSize: '0.85rem' 
              }}>
                3
              </div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, color: activeStep === 'settings' ? '#F36F21' : '#94A3B8', marginTop: '6px' }}>Settings</span>
            </div>

          </div>

          <div style={{ flex: 1 }}>
            
            {/* STEP 1: QUIZ DETAILS */}
            {activeStep === 'details' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Quiz Title *</label>
                  <input 
                    type="text" 
                    placeholder="Enter quiz title" 
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#071B36', fontSize: '0.88rem' }}
                  />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Description</label>
                    <span style={{ fontSize: '0.7rem', color: '#94A3B8' }}>{description.length}/250</span>
                  </div>
                  <textarea 
                    placeholder="Enter a short description of the quiz"
                    value={description}
                    maxLength={250}
                    onChange={e => setDescription(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#071B36', fontSize: '0.88rem', minHeight: '80px', resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Project / Client *</label>
                  <select 
                    value={projectId} 
                    onChange={(e) => setProjectId(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#071B36', fontSize: '0.88rem', outline: 'none' }}
                  >
                    <option value="">-- No Project (Global) --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Category</label>
                  <select 
                    value={config.category} 
                    onChange={(e) => setConfig({ ...config, category: e.target.value })}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#071B36', fontSize: '0.88rem', outline: 'none' }}
                  >
                    <option value="Product Knowledge">Product Knowledge</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Retail Excellence">Retail Excellence</option>
                    <option value="Soft Skills">Soft Skills</option>
                    <option value="Certification">Certification</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Time Limit</label>
                    <select 
                      value={config.time_limit} 
                      onChange={(e) => setConfig({ ...config, time_limit: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#071B36', fontSize: '0.88rem', outline: 'none' }}
                    >
                      <option value="No Limit">No Limit</option>
                      <option value="10 Sec">10 Sec</option>
                      <option value="15 Sec">15 Sec</option>
                      <option value="20 Sec">20 Sec</option>
                      <option value="30 Sec">30 Sec</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Passing Score (%)</label>
                    <input 
                      type="number" 
                      min="1" 
                      max="100"
                      value={config.passing_score}
                      onChange={e => setConfig({ ...config, passing_score: parseInt(e.target.value) || 50 })}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#071B36', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>

                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={handleNextStep}
                  style={{ width: '100%', marginTop: '12px', height: '42px', fontSize: '0.88rem', borderRadius: '8px', background: '#F8FAFC' }}
                >
                  Configure Questions →
                </button>
              </div>
            )}

            {/* STEP 2: QUESTIONS LIST MANAGEMENT */}
            {activeStep === 'questions' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Questions List ({questions.length})</label>
                  <button 
                    onClick={() => setIsAiModalOpen(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: '#F36F21', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
                  >
                    <Sparkles size={12} /> AI Generator
                  </button>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px' }}>
                  {questions.map((q, i) => {
                    const status = getQuestionStatus(q);
                    const isSelected = activeQuestionId === q.id;
                    return (
                      <div 
                        key={q.id}
                        onClick={() => setActiveQuestionId(q.id)}
                        style={{
                          padding: '10px 12px', 
                          borderRadius: '10px',
                          background: isSelected ? '#FFF5F0' : '#F8FAFC',
                          border: `1.5px solid ${isSelected ? '#F36F21' : '#E2E8F0'}`,
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.15s'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
                          <span style={{ 
                            width: '6px', height: '6px', borderRadius: '50%', 
                            background: status === 'completed' ? '#22C55E' : status === 'missing_answer' ? '#EF4444' : '#F59E0B'
                          }} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isSelected ? '#F36F21' : '#071B36', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            Q{i + 1}. {q.text || 'Empty Question'}
                          </span>
                        </div>
                        <button 
                          onClick={(e) => { e.stopPropagation(); deleteQuestion(q.id); }}
                          style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer', padding: '4px' }}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                  {questions.length === 0 && (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: '#94A3B8', fontSize: '0.82rem' }}>No questions added. Add one below!</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button onClick={handlePrevStep} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#F1F5F9', border: '1px solid #E2E8F0', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Back</button>
                  <button onClick={handleNextStep} style={{ flex: 2, padding: '10px', borderRadius: '8px', background: '#F36F21', border: 'none', color: 'white', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Advanced Settings</button>
                </div>
              </div>
            )}

            {/* STEP 3: ADVANCED QUIZ SETTINGS */}
            {activeStep === 'settings' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: '#071B36', margin: '0 0 4px 0' }}>Quiz Settings</h4>
                
                {[
                  { key: 'randomize_questions', label: 'Randomize Questions', desc: 'Shuffle the order of questions for learners' },
                  { key: 'randomize_answers', label: 'Randomize Answers', desc: 'Display options in random configurations' },
                  { key: 'show_results', label: 'Show Results', desc: 'Show detailed scores upon completion' },
                  { key: 'show_leaderboard', label: 'Show Leaderboard', desc: 'Foster engagement with live rankings' },
                  { key: 'certification_trigger', label: 'Certification Trigger', desc: 'Generate certificate automatically on pass' },
                  { key: 'negative_marking', label: 'Negative Marking', desc: 'Deduct marks for incorrect answers' }
                ].map(opt => (
                  <div key={opt.key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#1E293B', display: 'block' }}>{opt.label}</span>
                      <span style={{ fontSize: '0.7rem', color: '#64748B' }}>{opt.desc}</span>
                    </div>
                    {/* Custom HTML/CSS styled checkbox toggle */}
                    <input 
                      type="checkbox" 
                      checked={config[opt.key]}
                      onChange={e => setConfig({ ...config, [opt.key]: e.target.checked })}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>
                ))}

                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button onClick={handlePrevStep} style={{ flex: 1, padding: '10px', borderRadius: '8px', background: '#F1F5F9', border: '1px solid #E2E8F0', fontSize: '0.82rem', fontWeight: 600, cursor: 'pointer' }}>Back to Builder</button>
                </div>
              </div>
            )}

          </div>

          {/* Stepper bottom quick-add dropdown */}
          <div style={{ marginTop: 'auto', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
            <div style={{ position: 'relative' }}>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    addQuestion(e.target.value);
                  }
                }}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1.5px solid #F36F21',
                  background: '#FFF5F0',
                  color: '#F36F21',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              >
                <option value="">➕ Add Question...</option>
                <option value="mcq">Multiple Choice</option>
                <option value="multi_select">Multi-Select MCQ</option>
                <option value="true_false">True / False</option>
                <option value="open_text">Open Text</option>
                <option value="rating">Rating Poll</option>
                <option value="poll">Standard Poll</option>
                <option value="word_cloud">Word Cloud</option>
                <option value="match">Match the Following</option>
                <option value="sequence">Sequence Question</option>
              </select>
            </div>
            
            <button 
              onClick={() => setIsBulkModalOpen(true)}
              style={{
                width: '100%',
                marginTop: '10px',
                padding: '10px 12px',
                borderRadius: '8px',
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                color: '#475569',
                fontSize: '0.82rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Upload size={14} /> Bulk Upload Questions
            </button>
          </div>

        </div>

        {/* Column 2: Question Builder Workspace (Width 50%) */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          
          {/* Question Type Selection Bar */}
          <div style={{ display: 'flex', gap: '8px', background: '#FFFFFF', padding: '6px', borderRadius: '12px', border: '1px solid #E2E8F0', overflowX: 'auto', flexShrink: 0 }}>
            {[
              { type: 'mcq', label: 'Multiple Choice', col: '#2563EB', bg: '#EFF6FF' },
              { type: 'multi_select', label: 'Multi-Select MCQ', col: '#16A34A', bg: '#F0FDF4' },
              { type: 'true_false', label: 'True / False', col: '#EA580C', bg: '#FFF7ED' },
              { type: 'open_text', label: 'Open Text', col: '#7C3AED', bg: '#F5F3FF' },
            ].map(item => {
              const isSelected = activeQuestion?.type === item.type;
              return (
                <button
                  key={item.type}
                  onClick={() => {
                    if (activeQuestion) {
                      if (item.type === 'true_false') {
                        updateActiveQuestionFields({
                          type: item.type,
                          options: ['True', 'False'],
                          correct_answer: 'True'
                        });
                      } else if (item.type === 'open_text') {
                        updateActiveQuestionFields({
                          type: item.type,
                          options: [],
                          correct_answer: ''
                        });
                      } else {
                        updateActiveQuestionFields({
                          type: item.type,
                          options: ['', '', '', ''],
                          correct_answer: ''
                        });
                      }
                    } else {
                      addQuestion(item.type);
                    }
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    border: '1px solid transparent',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    color: item.col,
                    background: isSelected ? item.bg : 'transparent',
                    borderColor: isSelected ? item.col : 'transparent'
                  }}
                >
                  {item.label}
                </button>
              );
            })}
            
            {/* More options selector dropdown */}
            <div style={{ position: 'relative' }}>
              <select
                value=""
                onChange={(e) => {
                  if (e.target.value) {
                    if (activeQuestion) {
                      updateActiveQuestionFields({
                        type: e.target.value,
                        options: e.target.value === 'rating' ? [] : ['', '', '', ''],
                        correct_answer: ''
                      });
                    } else {
                      addQuestion(e.target.value);
                    }
                  }
                }}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                  color: '#475569',
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value="">More ▾</option>
                <option value="rating">Rating Poll</option>
                <option value="poll">Standard Poll</option>
                <option value="word_cloud">Word Cloud</option>
                <option value="match">Match the Following</option>
                <option value="sequence">Sequence Question</option>
              </select>
            </div>

          </div>

          {/* Active Question Editor Card */}
          {activeQuestion ? (
            <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' }}>
              
              {/* Question metadata row (number, AI help, points, delete) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ 
                    background: '#F1F5F9', color: '#475569', padding: '6px 14px', 
                    borderRadius: '8px', fontWeight: 800, fontSize: '0.88rem' 
                  }}>
                    Q{questions.findIndex(q => q.id === activeQuestion.id) + 1}
                  </span>
                  
                  {/* Category Type Indicator */}
                  <span style={{
                    fontSize: '0.75rem', fontWeight: 700, color: '#F36F21', background: 'rgba(243,111,33,0.08)',
                    padding: '4px 10px', borderRadius: '20px'
                  }}>
                    {getQuestionTypeLabel(activeQuestion.type)}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  
                  {/* AI Assistance helper */}
                  <button 
                    onClick={() => { setAiSourceType('PDF'); setIsAiModalOpen(true); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px', background: '#F5F3FF', border: '1px solid rgba(124,58,237,0.2)',
                      padding: '6px 12px', borderRadius: '8px', color: '#7C3AED', fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer'
                    }}
                  >
                    <Sparkles size={12} /> AI Assist
                  </button>

                  {/* Points setup */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#64748B', fontWeight: 600 }}>Points:</span>
                    <select
                      value={activeQuestion.points}
                      onChange={e => updateActiveQuestion('points', parseInt(e.target.value) || 1)}
                      style={{
                        padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#F8FAFC',
                        fontSize: '0.78rem', fontWeight: 700, outline: 'none'
                      }}
                    >
                      <option value={1}>1 Point</option>
                      <option value={2}>2 Points</option>
                      <option value={5}>5 Points</option>
                      <option value={10}>10 Points</option>
                    </select>
                  </div>

                  {/* 3-Dots actions menu */}
                  <div style={{ position: 'relative' }}>
                    <button 
                      onClick={() => duplicateQuestion(activeQuestion)}
                      className="btn btn-secondary btn-icon"
                      style={{ width: '32px', height: '32px', padding: 0, borderRadius: '8px', border: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Duplicate Question"
                    >
                      <Copy size={14} color="#64748B" />
                    </button>
                  </div>

                </div>
              </div>

              {/* Media URL setup */}
              <div style={{ marginBottom: '16px', flexShrink: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#F8FAFC', padding: '6px 12px', borderRadius: '8px', border: '1px solid #E2E8F0' }}>
                  <ImageIcon size={14} color="#64748B" />
                  <input 
                    type="text" 
                    value={activeQuestion.media_url || ''}
                    onChange={e => updateActiveQuestion('media_url', e.target.value)}
                    placeholder="Add Question Media URL (e.g. image link, YouTube video URL)"
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: '0.8rem', color: '#071B36' }}
                  />
                  {activeQuestion.media_url && (
                    <button 
                      onClick={() => updateActiveQuestion('media_url', '')}
                      style={{ background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      <X size={14} color="#EF4444" />
                    </button>
                  )}
                </div>
              </div>

              {/* Question Text Textarea */}
              <div style={{ marginBottom: '20px', flexShrink: 0 }}>
                <textarea 
                  value={activeQuestion.text}
                  onChange={e => updateActiveQuestion('text', e.target.value)}
                  placeholder="Enter your question here..."
                  style={{
                    width: '100%', padding: '16px', border: '1px solid #E2E8F0', borderRadius: '12px',
                    fontSize: '1.08rem', fontWeight: 600, color: '#071B36', minHeight: '80px', resize: 'none', outline: 'none',
                    background: '#F8FAFC'
                  }}
                  onFocus={e => e.currentTarget.style.borderColor = '#F36F21'}
                  onBlur={e => e.currentTarget.style.borderColor = '#E2E8F0'}
                />
              </div>

              {/* Question Options Workspace (depends on type) */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                
                {/* MCQ / Multi-Select Options */}
                {['mcq', 'multi_select', 'poll', 'match', 'sequence'].includes(activeQuestion.type) && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Answer Options</span>
                      {!['poll', 'match', 'sequence'].includes(activeQuestion.type) && (
                        <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Select correct option(s)</span>
                      )}
                    </div>

                    {(activeQuestion.options || []).map((opt, i) => {
                      const letter = String.fromCharCode(65 + i);
                      let isCorrect = false;
                      if (activeQuestion.type === 'multi_select') {
                        isCorrect = Array.isArray(activeQuestion.correct_answer) 
                          ? activeQuestion.correct_answer.includes(opt)
                          : (typeof activeQuestion.correct_answer === 'string' && activeQuestion.correct_answer.split(',').map(s => s.trim()).includes(opt));
                      } else {
                        isCorrect = activeQuestion.correct_answer === opt && opt !== '';
                      }

                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          
                          {/* Option Prefix Letter */}
                          <div style={{ 
                            width: '28px', height: '28px', borderRadius: '50%', 
                            background: isCorrect ? '#FFF5F0' : '#F1F5F9', 
                            border: `1.5px solid ${isCorrect ? '#F36F21' : '#E2E8F0'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: isCorrect ? '#F36F21' : '#475569', fontWeight: 800, fontSize: '0.8rem'
                          }}>
                            {letter}
                          </div>

                          <input 
                            type="text" 
                            value={opt}
                            onChange={e => updateOption(i, e.target.value)}
                            placeholder={`Enter option ${i + 1}`}
                            style={{ 
                              flex: 1, padding: '10px 14px', borderRadius: '8px', 
                              border: `1px solid ${isCorrect ? '#F36F21' : '#E2E8F0'}`, 
                              background: '#FFFFFF', color: '#071B36', fontSize: '0.88rem' 
                            }}
                          />

                          {/* Correct Answer Select Checkbox / Radio */}
                          {!['poll', 'match', 'sequence'].includes(activeQuestion.type) && (
                            activeQuestion.type === 'multi_select' ? (
                              <input 
                                type="checkbox" 
                                checked={isCorrect}
                                onChange={(e) => {
                                  let currentCorrect = [];
                                  if (Array.isArray(activeQuestion.correct_answer)) {
                                    currentCorrect = activeQuestion.correct_answer;
                                  } else if (typeof activeQuestion.correct_answer === 'string') {
                                    try {
                                      currentCorrect = JSON.parse(activeQuestion.correct_answer);
                                    } catch (err) {
                                      currentCorrect = activeQuestion.correct_answer ? activeQuestion.correct_answer.split(',').map(s => s.trim()) : [];
                                    }
                                  }
                                  if (e.target.checked) {
                                    updateActiveQuestion('correct_answer', [...currentCorrect, opt]);
                                  } else {
                                    updateActiveQuestion('correct_answer', currentCorrect.filter(c => c !== opt));
                                  }
                                }}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                            ) : (
                              <input 
                                type="radio" 
                                name={`correct_${activeQuestion.id}`}
                                checked={isCorrect}
                                onChange={() => updateActiveQuestion('correct_answer', opt)}
                                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                              />
                            )
                          )}

                          {activeQuestion.options.length > 2 && (
                            <button 
                              onClick={() => removeOption(i)} 
                              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '6px' }}
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      );
                    })}

                    {activeQuestion.options.length < 8 && (
                      <button 
                        onClick={addOption}
                        style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', fontWeight: 700, color: '#F36F21', background: 'none', border: 'none', cursor: 'pointer', marginTop: '6px' }}
                      >
                        <Plus size={14} /> Add Option
                      </button>
                    )}

                  </div>
                )}

                {/* True/False Options */}
                {activeQuestion.type === 'true_false' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Select Correct Answer</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      {['True', 'False'].map(opt => {
                        const isCorrect = activeQuestion.correct_answer === opt;
                        return (
                          <div 
                            key={opt}
                            onClick={() => updateActiveQuestion('correct_answer', opt)}
                            style={{
                              padding: '16px', borderRadius: '12px', border: `2px solid ${isCorrect ? '#F36F21' : '#E2E8F0'}`,
                              background: isCorrect ? '#FFF5F0' : '#FFFFFF', cursor: 'pointer', textAlign: 'center',
                              fontWeight: 700, color: isCorrect ? '#F36F21' : '#475569', transition: 'all 0.15s'
                            }}
                          >
                            {opt}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Open Text Options */}
                {activeQuestion.type === 'open_text' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#475569' }}>Expected Correct Answer / Keyword Phrase (Optional)</label>
                    <input 
                      type="text" 
                      value={activeQuestion.correct_answer || ''}
                      onChange={e => updateActiveQuestion('correct_answer', e.target.value)}
                      placeholder="e.g. security checklist, multi-factor authentication"
                      style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1px solid #E2E8F0', background: '#FFFFFF', color: '#071B36', fontSize: '0.88rem' }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>* Matches are evaluated case-insensitively during assessments.</span>
                  </div>
                )}

                {/* Rating Poll scale */}
                {activeQuestion.type === 'rating' && (
                  <div style={{ background: '#EFF6FF', border: '1px dashed #2563EB', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <AlertCircle size={20} color="#2563EB" />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E293B' }}>Rating Scale selection</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Learners will be presented with a 1 to 5 star rating interface for feedback.</div>
                    </div>
                  </div>
                )}

                {/* Word Cloud Poll */}
                {activeQuestion.type === 'word_cloud' && (
                  <div style={{ background: '#F5F3FF', border: '1px dashed #7C3AED', padding: '16px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Sparkles size={20} color="#7C3AED" />
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#1E293B' }}>Word Cloud generation</div>
                      <div style={{ fontSize: '0.72rem', color: '#64748B' }}>Answers submitted by supervisors will be rendered dynamically in a tag cloud on presenter screens.</div>
                    </div>
                  </div>
                )}

              </div>
            </div>
          ) : (
            <div 
              onClick={() => addQuestion('mcq')}
              style={{ 
                flex: 1, display: 'flex', border: '2px dashed #E2E8F0', borderRadius: '16px', background: '#FFFFFF',
                alignItems: 'center', justifyContent: 'center', flexDirection: 'column', color: '#94A3B8', cursor: 'pointer',
                transition: 'border-color 0.2s', minHeight: '300px'
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = '#F36F21'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#E2E8F0'}
            >
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid #E2E8F0' }}>
                <Plus size={24} color="#94A3B8" />
              </div>
              <strong style={{ color: '#475569', fontSize: '0.92rem' }}>Add New Question</strong>
              <p style={{ fontSize: '0.78rem', color: '#94A3B8', marginTop: '4px' }}>Click to append a question card</p>
            </div>
          )}

          {/* Dotted dropzone at bottom of workspace */}
          {activeQuestion && (
            <div 
              onClick={() => addQuestion('mcq')}
              style={{
                border: '2px dashed #E2E8F0', borderRadius: '12px', padding: '16px', textAlign: 'center',
                cursor: 'pointer', background: '#F8FAFC', color: '#64748B', display: 'flex', alignItems: 'center',
                justifyContent: 'center', gap: '8px', flexShrink: 0
              }}
              onMouseOver={e => e.currentTarget.style.borderColor = '#F36F21'}
              onMouseOut={e => e.currentTarget.style.borderColor = '#E2E8F0'}
            >
              <Plus size={16} />
              <strong style={{ fontSize: '0.85rem' }}>Add New Question</strong>
              <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>({questions.length} total)</span>
            </div>
          )}

        </div>

        {/* Column 3: Quiz Overview & Navigation Panel (Width 20%) */}
        <div style={{ width: '240px', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
          
          {/* Quiz Overview statistics */}
          <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#071B36', margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <List size={16} color="#F36F21" /> Quiz Overview
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Total Questions</span>
                <strong style={{ color: '#071B36' }}>{totalQuestions}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Total Points</span>
                <strong style={{ color: '#071B36' }}>{totalPoints}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Estimated Time</span>
                <strong style={{ color: '#071B36' }}>{Math.round(estimatedTime / 60) || 1} min</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Passing Score</span>
                <strong style={{ color: '#071B36' }}>{config.passing_score}%</strong>
              </div>
              
              <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: '10px', marginTop: '4px' }}>
                <span style={{ color: '#64748B', display: 'block', marginBottom: '6px', fontSize: '0.75rem', fontWeight: 600 }}>Difficulty Distribution</span>
                <div style={{ display: 'flex', gap: '6px', fontSize: '0.72rem' }}>
                  <span style={{ background: '#F0FDF4', color: '#16A34A', padding: '2px 6px', borderRadius: '4px' }}>Easy: {easyCount}</span>
                  <span style={{ background: '#FFF7ED', color: '#EA580C', padding: '2px 6px', borderRadius: '4px' }}>Med: {mediumCount}</span>
                  <span style={{ background: '#FEF2F2', color: '#EF4444', padding: '2px 6px', borderRadius: '4px' }}>Hard: {hardCount}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Question Navigation Map */}
          <div className="glass-card" style={{ background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
            <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#071B36', margin: '0 0 12px 0' }}>Question Map</h3>
            
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {questions.map((q, i) => {
                const status = getQuestionStatus(q);
                let col = '#E2E8F0';
                let textCol = '#475569';
                if (status === 'completed') { col = '#22C55E'; textCol = '#FFFFFF'; }
                else if (status === 'missing_answer') { col = '#EF4444'; textCol = '#FFFFFF'; }
                else if (status === 'draft') { col = '#F59E0B'; textCol = '#FFFFFF'; }

                const isSelected = activeQuestionId === q.id;

                return (
                  <button
                    key={q.id}
                    onClick={() => { setActiveQuestionId(q.id); setActiveStep('questions'); }}
                    style={{
                      width: '32px', height: '32px', borderRadius: '8px', background: col, color: textCol,
                      fontWeight: 800, fontSize: '0.78rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', border: isSelected ? '2px solid #071B36' : 'none',
                      boxShadow: isSelected ? '0 0 0 1.5px #FFFFFF, 0 0 8px rgba(0,0,0,0.15)' : 'none'
                    }}
                  >
                    Q{i + 1}
                  </button>
                );
              })}
              {questions.length === 0 && <span style={{ fontSize: '0.78rem', color: '#94A3B8' }}>No questions.</span>}
            </div>

            <div style={{ display: 'flex', gap: '8px', fontSize: '0.62rem', marginTop: '12px', color: '#64748B', fontWeight: 600 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22C55E' }} /> Done</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#F59E0B' }} /> Draft</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}><span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#EF4444' }} /> Empty</span>
            </div>
          </div>

          {/* Quick Tips */}
          <div className="glass-card" style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: '16px', padding: '20px' }}>
            <h4 style={{ fontSize: '0.82rem', fontWeight: 800, color: '#071B36', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={14} color="#F36F21" /> Tips for Better Quizzes
            </h4>
            <ul style={{ paddingLeft: '14px', margin: 0, fontSize: '0.75rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <li>Keep questions clear and concise</li>
              <li>Use images to enhance understanding</li>
              <li>Mix questions types for engagement</li>
              <li>Set appropriate time limits</li>
              <li>Review answers before publishing</li>
            </ul>
          </div>

        </div>

      </div>

      {/* ─── AI QUESTION GENERATOR MODAL ─── */}
      {isAiModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '500px', background: '#FFFFFF', padding: '28px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#071B36', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Sparkles size={18} color="#7C3AED" /> Generate Questions with AI
              </h3>
              <button onClick={() => setIsAiModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>Source Type</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {['PDF', 'PPT', 'Video Transcript', 'Text Description'].map(src => (
                    <button
                      key={src}
                      onClick={() => setAiSourceType(src)}
                      style={{
                        flex: 1, padding: '8px 4px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700,
                        border: `1.5px solid ${aiSourceType === src ? '#7C3AED' : '#E2E8F0'}`,
                        background: aiSourceType === src ? '#F5F3FF' : '#FFFFFF',
                        color: aiSourceType === src ? '#7C3AED' : '#475569', cursor: 'pointer'
                      }}
                    >
                      {src}
                    </button>
                  ))}
                </div>
              </div>

              {['PDF', 'PPT'].includes(aiSourceType) && (
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                    Upload {aiSourceType} Source File *
                  </label>
                  <div style={{
                    border: '2px dashed #7C3AED', borderRadius: '12px', padding: '20px 16px', textAlign: 'center', background: '#F5F3FF',
                    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
                  }}>
                    <input 
                      type="file" 
                      accept={aiSourceType === 'PDF' ? '.pdf' : '.ppt,.pptx'}
                      style={{ fontSize: '0.82rem', maxWidth: '100%', cursor: 'pointer' }}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setAiInputText(`[Uploaded File: ${file.name}]\nGenerate questions based on this slide deck.`);
                        }
                      }}
                    />
                    <span style={{ fontSize: '0.72rem', color: '#6D28D9', fontWeight: 500 }}>Max file size 10MB</span>
                  </div>
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.82rem', color: '#475569', fontWeight: 600 }}>
                  {aiSourceType === 'Text Description' ? 'Prompt details' : 'Paste content or type guidance *'}
                </label>
                <textarea
                  value={aiInputText}
                  onChange={e => setAiInputText(e.target.value)}
                  placeholder={`Describe what topics to generate questions on, or paste guidelines here...`}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #E2E8F0', minHeight: '100px', resize: 'vertical', fontSize: '0.82rem', color: '#071B36', background: '#F8FAFC' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                <button className="btn btn-secondary btn-sm" style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '8px' }} onClick={() => setIsAiModalOpen(false)}>Cancel</button>
                <button 
                  onClick={handleGenerateWithAi} 
                  disabled={aiGenerating || !aiInputText.trim()}
                  style={{ 
                    padding: '10px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', 
                    color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  {aiGenerating ? "Generating..." : <><Sparkles size={14} /> Generate with AI</>}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ─── BULK UPLOAD QUESTIONS MODAL ─── */}
      {isBulkModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, backdropFilter: 'blur(4px)' }}>
          <div className="glass-card" style={{ width: '480px', background: '#FFFFFF', padding: '28px', borderRadius: '16px', border: '1px solid #E2E8F0', boxShadow: '0 20px 50px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontFamily: 'Poppins, sans-serif', fontWeight: 800, color: '#071B36', fontSize: '1.2rem' }}>
                Bulk Import Questions
              </h3>
              <button onClick={() => setIsBulkModalOpen(false)} style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}><X size={20} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              <div 
                style={{
                  border: '2px dashed #E2E8F0', borderRadius: '12px', padding: '32px 16px',
                  textAlign: 'center', cursor: 'pointer', background: '#F8FAFC'
                }}
              >
                <input 
                  type="file" 
                  accept=".csv,.json"
                  onChange={e => setBulkFile(e.target.files[0])}
                  style={{ display: 'block', margin: '0 auto 12px auto', fontSize: '0.82rem' }}
                />
                <span style={{ fontSize: '0.72rem', color: '#94A3B8' }}>Supported formats: CSV template or standard JSON array</span>
              </div>

              {bulkValidateErrors.length > 0 && (
                <div style={{ background: '#FEF2F2', border: '1.5px solid #FCA5A5', padding: '10px 14px', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {bulkValidateErrors.map((err, idx) => (
                    <span key={idx} style={{ color: '#EF4444', fontSize: '0.75rem', fontWeight: 600 }}>● {err}</span>
                  ))}
                </div>
              )}

              {/* Templates download links */}
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#F36F21', fontWeight: 600 }}>
                <a href="#csv-template" onClick={handleDownloadCsvTemplate}>📥 Download CSV Template</a>
                <a href="#json-template" onClick={handleDownloadJsonTemplate}>📥 Download JSON Template</a>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #E2E8F0', paddingTop: '16px' }}>
                <button className="btn btn-secondary btn-sm" style={{ background: '#F1F5F9', border: '1px solid #E2E8F0', borderRadius: '8px' }} onClick={() => setIsBulkModalOpen(false)}>Cancel</button>
                <button 
                  onClick={handleBulkUploadParse} 
                  disabled={!bulkFile}
                  style={{ 
                    padding: '10px 18px', borderRadius: '8px', background: 'linear-gradient(135deg, #F36F21 0%, #E05A0E 100%)', 
                    color: 'white', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px'
                  }}
                >
                  Validate & Import
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ─── PREVIEW QUIZ MODAL (FULL EXPERIENCE DIALOG) ─── */}
      {isPreviewOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', zIndex: 1000, backdropFilter: 'blur(6px)' }}>
          
          {/* Preview Header controls */}
          <div style={{ background: '#071B36', color: 'white', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 800 }}>Preview: {title || 'Untitled Assessment'}</h3>
              <p style={{ margin: '2px 0 0 0', color: '#94A3B8', fontSize: '0.72rem' }}>Simulating real participant execution layout</p>
            </div>
            
            {/* Device mockups switch */}
            <div style={{ display: 'flex', gap: '6px', background: 'rgba(255,255,255,0.08)', padding: '4px', borderRadius: '8px' }}>
              {[
                { key: 'desktop', label: 'Desktop', icon: <Laptop size={14} /> },
                { key: 'tablet', label: 'Tablet', icon: <Tablet size={14} /> },
                { key: 'mobile', label: 'Mobile', icon: <Smartphone size={14} /> }
              ].map(dev => (
                <button
                  key={dev.key}
                  onClick={() => setPreviewDevice(dev.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px', borderRadius: '6px',
                    fontSize: '0.75rem', fontWeight: 700, border: 'none', cursor: 'pointer',
                    color: previewDevice === dev.key ? '#071B36' : 'white',
                    background: previewDevice === dev.key ? 'white' : 'transparent'
                  }}
                >
                  {dev.icon} <span>{dev.label}</span>
                </button>
              ))}
            </div>

            <button onClick={() => setIsPreviewOpen(false)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '4px' }}><X size={20} /></button>
          </div>

          {/* Preview Arena (Device Wrapper) */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#F8FAFC', overflowY: 'auto' }}>
            
            {/* Mockup Frame based on selected device */}
            <div style={{
              width: previewDevice === 'mobile' ? '375px' : previewDevice === 'tablet' ? '768px' : '100%',
              height: previewDevice === 'mobile' ? '680px' : previewDevice === 'tablet' ? '540px' : '100%',
              background: '#FFFFFF',
              borderRadius: previewDevice === 'desktop' ? '0' : '28px',
              border: previewDevice === 'desktop' ? 'none' : '12px solid #071B36',
              boxShadow: '0 25px 50px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
            }}>
              
              {/* Simulator Screens */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '32px', background: '#F8FAFC', overflowY: 'auto', color: '#071B36' }}>
                
                {/* 1. Welcome screen */}
                {previewProgress === 'welcome' && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', maxWidth: '480px', margin: '0 auto' }}>
                    <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'rgba(243,111,33,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px' }}>
                      <Play size={24} color="#F36F21" />
                    </div>
                    
                    <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#071B36', marginBottom: '8px' }}>{title || 'Untitled Assessment'}</h2>
                    <p style={{ color: '#64748B', fontSize: '0.88rem', marginBottom: '24px' }}>{description || 'Welcome to this interactive capability training check. Good luck!'}</p>

                    <div style={{ width: '100%', border: '1px solid #E2E8F0', borderRadius: '12px', background: '#FFFFFF', padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '28px', fontSize: '0.82rem' }}>
                      <div style={{ borderRight: '1px solid #E2E8F0' }}>
                        <span style={{ color: '#94A3B8', display: 'block', fontWeight: 500 }}>Questions</span>
                        <strong style={{ fontSize: '1.05rem', color: '#071B36' }}>{questions.length}</strong>
                      </div>
                      <div>
                        <span style={{ color: '#94A3B8', display: 'block', fontWeight: 500 }}>Passing Score</span>
                        <strong style={{ fontSize: '1.05rem', color: '#071B36' }}>{config.passing_score}%</strong>
                      </div>
                    </div>

                    <button 
                      onClick={handleStartQuizPreview}
                      style={{ width: '100%', padding: '12px', background: 'linear-gradient(135deg, #F36F21 0%, #E05A0E 100%)', border: 'none', color: 'white', fontWeight: 700, borderRadius: '8px', fontSize: '0.88rem', cursor: 'pointer', boxShadow: '0 4px 12px rgba(243,111,33,0.2)' }}
                    >
                      Start Assessment
                    </button>
                  </div>
                )}

                {/* 2. Questions screen */}
                {previewProgress === 'quiz' && (() => {
                  const currentQ = questions[previewQIndex];
                  const selectedVal = previewAnswers[currentQ.id];
                  
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', maxWidth: '600px', width: '100%', margin: '0 auto' }}>
                      
                      {/* Top status */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#F36F21' }}>Question {previewQIndex + 1} of {questions.length}</span>
                        <span style={{ fontSize: '0.75rem', background: '#FFF7ED', padding: '4px 8px', borderRadius: '4px', fontWeight: 600, color: '#EA580C' }}>⏰ {currentQ.time_limit}s Limit</span>
                      </div>

                      {/* Question Text */}
                      <h3 style={{ fontSize: '1.18rem', fontWeight: 700, color: '#071B36', marginBottom: '20px', lineHeight: 1.4 }}>{currentQ.text}</h3>

                      {/* Media (if URL) */}
                      {currentQ.media_url && (
                        <div style={{ marginBottom: '20px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #E2E8F0', height: '120px', background: '#F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <img src={currentQ.media_url} alt="Media hint" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        </div>
                      )}

                      {/* Options listing */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                        {['mcq', 'multi_select', 'true_false', 'poll'].includes(currentQ.type) && (currentQ.options || []).map((opt, i) => {
                          const isSelected = currentQ.type === 'multi_select' 
                            ? (Array.isArray(selectedVal) ? selectedVal.includes(opt) : false)
                            : selectedVal === opt;
                          
                          return (
                            <div 
                              key={i}
                              onClick={() => {
                                if (currentQ.type === 'multi_select') {
                                  let currentArr = Array.isArray(selectedVal) ? selectedVal : [];
                                  if (currentArr.includes(opt)) {
                                    handlePreviewAnswerSelect(currentArr.filter(c => c !== opt));
                                  } else {
                                    handlePreviewAnswerSelect([...currentArr, opt]);
                                  }
                                } else {
                                  handlePreviewAnswerSelect(opt);
                                }
                              }}
                              style={{
                                display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 18px',
                                borderRadius: '10px', border: `1.5px solid ${isSelected ? '#F36F21' : '#E2E8F0'}`,
                                background: isSelected ? '#FFF5F0' : '#FFFFFF', cursor: 'pointer', transition: 'all 0.15s'
                              }}
                            >
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: isSelected ? '#F36F21' : '#475569' }}>{opt}</span>
                            </div>
                          );
                        })}

                        {currentQ.type === 'open_text' && (
                          <input 
                            type="text"
                            value={selectedVal || ''}
                            onChange={e => handlePreviewAnswerSelect(e.target.value)}
                            placeholder="Type your answer keyword phrase here..."
                            style={{ width: '100%', padding: '12px 14px', borderRadius: '8px', border: '1.5px solid #E2E8F0', background: 'white', color: '#071B36', fontSize: '0.88rem' }}
                          />
                        )}
                      </div>

                      {/* Bottom navigation */}
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #E2E8F0' }}>
                        <button 
                          onClick={handlePreviewNext}
                          disabled={selectedVal === undefined || selectedVal === ''}
                          style={{
                            padding: '10px 24px', borderRadius: '8px', 
                            background: (selectedVal === undefined || selectedVal === '') ? '#E2E8F0' : 'linear-gradient(135deg, #F36F21 0%, #E05A0E 100%)',
                            color: 'white', border: 'none', fontWeight: 700, cursor: (selectedVal === undefined || selectedVal === '') ? 'not-allowed' : 'pointer', fontSize: '0.85rem'
                          }}
                        >
                          {previewQIndex < questions.length - 1 ? "Next Question →" : "Finish Preview"}
                        </button>
                      </div>

                    </div>
                  );
                })()}

                {/* 3. Results screen */}
                {previewProgress === 'results' && (() => {
                  const passVal = totalQuestions > 0 ? Math.round((previewScore / totalPoints) * 100) : 0;
                  const isPass = passVal >= config.passing_score;
                  
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center', maxWidth: '440px', margin: '0 auto' }}>
                      <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: isPass ? '#DCFCE7' : '#FEF2F2', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center', marginBottom: '20px', border: `2px solid ${isPass ? '#22C55E' : '#EF4444'}` }}>
                        {isPass ? <Check size={28} color="#22C55E" /> : <X size={28} color="#EF4444" />}
                      </div>

                      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#071B36', marginBottom: '8px' }}>
                        {isPass ? "Congratulations! Passed." : "Keep learning! Under threshold."}
                      </h2>
                      <p style={{ color: '#64748B', fontSize: '0.88rem', marginBottom: '24px' }}>
                        You answered the mock preview questions. Let's look at your score breakdown.
                      </p>

                      <div style={{ width: '100%', background: '#FFFFFF', border: '1px solid #E2E8F0', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem', marginBottom: '28px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Correct Points</span>
                          <strong style={{ color: '#071B36' }}>{previewScore} / {totalPoints}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Accuracy Percentage</span>
                          <strong style={{ color: isPass ? '#22C55E' : '#EF4444' }}>{passVal}%</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#64748B' }}>Required Threshold</span>
                          <strong style={{ color: '#071B36' }}>{config.passing_score}%</strong>
                        </div>
                      </div>

                      <button 
                        onClick={() => setPreviewProgress('welcome')}
                        style={{ width: '100%', padding: '12px', background: '#F1F5F9', border: '1px solid #E2E8F0', color: '#475569', fontWeight: 700, borderRadius: '8px', fontSize: '0.88rem', cursor: 'pointer' }}
                      >
                        Retake Preview Quiz
                      </button>
                    </div>
                  );
                })()}

              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
