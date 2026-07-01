import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, Edit3, Save, Lock, ArrowLeft, PlusCircle,
  Link2, List, Layers, ChevronDown, ChevronRight,
  Trash2, ArrowUp, ArrowDown, Bold, ImageIcon, Upload,
  Plus, AlertCircle, Trash2 as TrashIcon, ArrowRight,
  Link as LinkIcon, ImagePlus, Wand2, Sparkles, X, Brain,
  LogOut, User as UserIcon, Settings
} from 'lucide-react';
import { INITIAL_DB, iconMap } from './constants';
import { GoogleGenAI, Type } from "@google/genai";
import { db, auth, googleProvider, signInWithPopup, onAuthStateChanged, signOut } from './firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  addDoc,
  getDoc,
  deleteDoc, 
  updateDoc, 
  query, 
  orderBy,
  writeBatch
} from 'firebase/firestore';


// --- Helper Components for Edit Mode (Defined Outside to avoid re-mounting) ---
const DebouncedTextarea = ({ value, onChange, className, style, ...props }: any) => {
  const [localValue, setLocalValue] = useState(value);
  const isFocused = useRef(false);

  useEffect(() => {
    if (!isFocused.current) {
      setLocalValue(value);
    }
  }, [value]);

  useEffect(() => {
    if (localValue === value) return;
    const timer = setTimeout(() => {
      // 在輸入時不要強制觸發外部更新過於頻繁
      // 但我們需要確保最終會發送到外部
    }, 1000); 
    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  const handleBlur = () => {
    isFocused.current = false;
    if (localValue !== value) {
      onChange(localValue);
    }
  };

  const handleFocus = () => {
    isFocused.current = true;
  };

  return (
    <textarea
      {...props}
      className={className}
      style={style}
      value={localValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={(e) => setLocalValue(e.target.value)}
    />
  );
};

const DebouncedInput = ({ value, onChange, className, style, ...props }: any) => {
  const [localValue, setLocalValue] = useState(value);
  const isFocused = useRef(false);
  const hasTyped = useRef(false);

  useEffect(() => {
    if (!isFocused.current || !hasTyped.current || (value && typeof value === 'string' && value.startsWith('data:'))) {
      setLocalValue(value);
      if (value && typeof value === 'string' && value.startsWith('data:')) {
        hasTyped.current = false;
      }
    }
  }, [value]);

  const handleBlur = () => {
    isFocused.current = false;
    if (localValue !== value && hasTyped.current) {
      onChange(localValue);
    }
    hasTyped.current = false;
  };

  const handleFocus = () => {
    isFocused.current = true;
  };

  return (
    <input
      {...props}
      className={className}
      style={style}
      value={localValue}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={(e) => {
        hasTyped.current = true;
        setLocalValue(e.target.value);
      }}
    />
  );
};

const handleFirestoreError = (error: any, operation: string) => {
  console.error(`Firestore Error [${operation}]:`, error);
  const msg = error.message || '';
  
  if (msg.includes('exceeds the maximum allowed size') || msg.includes('too large')) {
    alert('【儲存失敗：資料量超標】\n您的設定內容太大（超過 1MB）。請更換較小的圖片或減少文字內容。');
  } else if (msg.includes('resource-exhausted') || msg.includes('Quota exceeded')) {
    alert('【系統配額已達上限】\n今日資料庫的寫入次數已達 Firebase 免費额度上限。請：\n1. 等待明日配額重置 (台灣時間約下午 3~4 點)。\n2. 暫時不要頻繁點擊儲存。');
  } else if (msg.includes('insufficient permissions')) {
    alert('【操作失敗：權限不足】\n請確認：\n1. 您是否已登入正確的 Admin 帳號。\n2. 您的 Email 是否已通過驗證。\n3. 建議重新整理頁面再試。');
  } else {
    alert(`操作失敗 [${operation}]: ${msg || '未知錯誤'}`);
  }
};

const getObjectSize = (obj: any) => {
  try {
    const str = JSON.stringify(obj);
    return str.length; // 回傳字串長度作為估算
  } catch (e) {
    return 0;
  }
};

const escapeRegExp = (str: string) => {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

const highlightText = (text: string, search: string) => {
  if (!search || !search.trim()) return text;
  const regex = new RegExp(`(${escapeRegExp(search)})`, 'gi');
  const parts = text.split(regex);
  return (
    <>
      {parts.map((part, i) => 
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200 text-amber-950 font-black px-1 rounded-md shadow-sm ring-1 ring-amber-300">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
};

const compressImage = (base64Str: string, maxWidth = 800): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.src = base64Str;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx?.drawImage(img, 0, 0, width, height);
      // 使用 jpeg 格式並將品質設定為 0.6 進一步減少體積
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
  });
};

const IconPicker = ({ currentIcon, onChange, size = 18 }: { currentIcon: string, onChange: (icon: string) => void, size?: number }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="relative">
      <button 
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className="flex items-center justify-center hover:bg-black/5 rounded-lg p-1 transition-colors"
      >
        {React.cloneElement(iconMap[currentIcon] || <List size={size}/>, { size })}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute top-full left-0 mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl p-4 grid grid-cols-6 gap-2 z-50 w-64 max-h-64 overflow-y-auto backdrop-blur-xl bg-white/95">
             {Object.keys(iconMap).map((iconName) => (
               <button
                 key={iconName}
                 onClick={(e) => {
                   e.stopPropagation();
                   onChange(iconName);
                   setIsOpen(false);
                 }}
                 className={`p-2 rounded-xl flex items-center justify-center transition-all ${currentIcon === iconName ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
               >
                 {React.cloneElement(iconMap[iconName], { size: 18 })}
               </button>
             ))}
          </div>
        </>
      )}
    </div>
  );
};

const App = () => {
  // --- States ---
  const [groups, setGroups] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  
  const [user, setUser] = useState(null);
  const [isSnapshotReady, setIsSnapshotReady] = useState(false);
  
  const dbData = useMemo(() => {
    return groups.map(g => ({
      ...g,
      items: items.filter(i => i.groupId === g.id).map(i => ({
        ...i,
        content: sections.filter(s => s.itemId === i.id)
      }))
    }));
  }, [groups, items, sections]);

  const touchItem = async (gIdx, iIdx) => {
    try {
      const groupData = dbData[gIdx];
      const item = groupData?.items?.[iIdx];
      if (!item) return;

      // 檢查是否最近已經更新過 (1分鐘內)，避免頻繁寫入
      if (item.updatedAt && (Date.now() - item.updatedAt < 60000)) {
        return;
      }

      console.log(`[Firestore Write] touchItem: ${item.id} (last update: ${item.updatedAt})`);
      const itemRef = doc(db, 'items', item.id);
      await updateDoc(itemRef, { updatedAt: Date.now() });
    } catch (error) {
      console.error("Failed to update item timestamp:", error);
    }
  };
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeId, setActiveId] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState(false);
  
  // Font Sizes
  const [detailTitleFontSize, setDetailTitleFontSize] = useState(36);
  const [groupFontSize, setGroupFontSize] = useState(16);
  const [itemFontSize, setItemFontSize] = useState(14);
  const [sectionFontSize, setSectionFontSize] = useState(18);
  const [contentFontSize, setContentFontSize] = useState(14);
  const [linkFontSize, setLinkFontSize] = useState(12);
  const [backupData, setBackupData] = useState(null);

  // Layout States
  const [expandedGroups, setExpandedGroups] = useState({});
  const [hasInitializedExpanded, setHasInitializedExpanded] = useState(false);
  const [headerTitle, setHeaderTitle] = useState('RD2 行政百科');
  const [headerSubtitle, setHeaderSubtitle] = useState('Executive Encyclopedia');
  const [headerDescription, setHeaderDescription] = useState('一站式行政資源，精準搜尋，快速導航。');
  const [footerTaxLabel, setFooterTaxLabel] = useState('TAX ID:');
  const [footerTaxId, setFooterTaxId] = useState('23519738');
  const [footerCopyright, setFooterCopyright] = useState('IGS · ACD RD2 Manual');
  const [footerScrollText, setFooterScrollText] = useState('Scroll Top ↑');
  const [homeBlocks, setHomeBlocks] = useState([]);
  const [fullscreenImage, setFullscreenImage] = useState(null);
  const mainScrollRef = useRef<HTMLElement>(null);

  // AI Content Importer States
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [aiInputText, setAiInputText] = useState('');
  const [aiNewItemTitle, setAiNewItemTitle] = useState('');
  const [isOrganizing, setIsOrganizing] = useState(false);
  const [aiTargetGroupId, setAiTargetGroupId] = useState(null);
  const [showFontControls, setShowFontControls] = useState(false);

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady) return;
    
    const unsubscribeConfig = onSnapshot(doc(db, 'config', 'general'), (snap) => {
      if (snap.exists() && !isEditMode) {
        const data = snap.data();
        if (data.headerTitle) setHeaderTitle(data.headerTitle);
        if (data.headerSubtitle) setHeaderSubtitle(data.headerSubtitle);
        if (data.headerDescription) setHeaderDescription(data.headerDescription);
        if (data.footerTaxLabel) setFooterTaxLabel(data.footerTaxLabel);
        if (data.footerTaxId) setFooterTaxId(data.footerTaxId);
        if (data.footerCopyright) setFooterCopyright(data.footerCopyright);
        if (data.footerScrollText) setFooterScrollText(data.footerScrollText);
        if (data.detailTitleFontSize) setDetailTitleFontSize(data.detailTitleFontSize);
        if (data.groupFontSize) setGroupFontSize(data.groupFontSize);
        if (data.itemFontSize) setItemFontSize(data.itemFontSize);
        if (data.sectionFontSize) setSectionFontSize(data.sectionFontSize);
        if (data.contentFontSize) setContentFontSize(data.contentFontSize);
        if (data.linkFontSize) setLinkFontSize(data.linkFontSize);
      }
    }, (error) => handleFirestoreError(error, 'onSnapshot-config-general'));
    
    // 分離監聽首頁區塊，分散資料量壓力
    const unsubscribeHome = onSnapshot(doc(db, 'config', 'home'), (snap) => {
      if (snap.exists() && !isEditMode) {
        const data = snap.data();
        if (data.homeBlocks) {
          console.log(`[Firestore Read] Loaded homeBlocks: ${data.homeBlocks.length} blocks`);
          setHomeBlocks(data.homeBlocks);
        }
      }
    }, (error) => handleFirestoreError(error, 'onSnapshot-config-home'));

    return () => {
      unsubscribeConfig();
      unsubscribeHome();
    };
  }, [isAuthReady, isEditMode]);

  useEffect(() => {
    if (!isAuthReady) return;

    // Listen for groups
    const qGroups = query(collection(db, 'groups'), orderBy('order', 'asc'));
    const unsubscribeGroups = onSnapshot(qGroups, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`[Firestore Read] Groups: ${data.length} docs`);
      setGroups(data);
      setIsSnapshotReady(true);
      
      // Expand all groups by default on first load
      if (data.length > 0 && !hasInitializedExpanded) {
        const initialExpanded = {};
        data.forEach(g => { initialExpanded[g.id] = true; });
        setExpandedGroups(prev => ({ ...prev, ...initialExpanded }));
        setHasInitializedExpanded(true);
      }
    }, (error) => handleFirestoreError(error, 'onSnapshot-groups'));

    // Listen for items
    const qItems = query(collection(db, 'items'), orderBy('order', 'asc'));
    const unsubscribeItems = onSnapshot(qItems, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`[Firestore Read] Items: ${data.length} docs`);
      setItems(data);
    }, (error) => handleFirestoreError(error, 'onSnapshot-items'));

    // Listen for sections
    const qSections = query(collection(db, 'sections'), orderBy('order', 'asc'));
    const unsubscribeSections = onSnapshot(qSections, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      console.log(`[Firestore Read] Sections: ${data.length} docs`);
      setSections(data);
    }, (error) => handleFirestoreError(error, 'onSnapshot-sections'));

    return () => {
      unsubscribeGroups();
      unsubscribeItems();
      unsubscribeSections();
    };
  }, [isAuthReady]);

  const logout = async () => {
    await signOut(auth);
    setIsEditMode(false);
  };

  const seedDatabase = async () => {
    if (!user) return;
    const batch = writeBatch(db);
    
    INITIAL_DB.forEach((group, gIdx) => {
      const groupRef = doc(db, 'groups', group.id);
      batch.set(groupRef, {
        id: group.id,
        group: group.group,
        description: group.description,
        order: gIdx
      });

      group.items.forEach((item, iIdx) => {
        const itemRef = doc(db, 'items', item.id);
        batch.set(itemRef, {
          id: item.id,
          groupId: group.id,
          title: item.title,
          icon: item.icon,
          updatedAt: (item as any).updatedAt || Date.now(),
          order: iIdx
        });

        item.content.forEach((section, sIdx) => {
          const sectionId = `${item.id}_s${sIdx}`;
          const sectionRef = doc(db, 'sections', sectionId);
          batch.set(sectionRef, {
            id: sectionId,
            itemId: item.id,
            title: section.title,
            type: section.type,
            items: section.items || [],
            links: section.links || [],
            order: sIdx
          });
        });
      });
    });

    await batch.commit();
    alert("資料庫已成功初始化");
  };

  const [loadingText, setLoadingText] = useState('正在處理中...');

  // --- Logic Helpers ---
  const toggleGroup = (id) => {
    setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const ADMIN_EMAIL = (import.meta as any).env.VITE_ADMIN_EMAIL || 'fannywang062igs@gmail.com';
  const LOGIN_PASS = (import.meta as any).env.VITE_LOGIN_PASS || 'igs2037';
  const EDIT_PASS = (import.meta as any).env.VITE_EDIT_PASS || '2037';

  const verifyPassword = async () => {
    const requiredPass = !user ? LOGIN_PASS : EDIT_PASS;
    if (passwordInput === requiredPass) {
      setPasswordError(false);
      setShowPasswordModal(false);
      
      if (!user) {
        // Login Flow
        try {
          const result = await signInWithPopup(auth, googleProvider);
          if (result.user.email !== ADMIN_EMAIL) {
            await signOut(auth);
            alert('權限不足：限特定管理者帳號登入。');
          }
        } catch (error) {
          console.error("Login failed:", error);
        }
      } else {
        // Edit Mode Flow
        setBackupData({
          dbData: JSON.parse(JSON.stringify(dbData)),
          homeBlocks: JSON.parse(JSON.stringify(homeBlocks)),
          headerTitle, headerSubtitle, headerDescription, footerTaxLabel, footerTaxId, footerCopyright, footerScrollText,
          groupFontSize, itemFontSize, sectionFontSize, contentFontSize, linkFontSize
        });
        setIsEditMode(true);
      }
    } else {
      setPasswordError(true);
    }
  };

  const cancelEdit = () => {
    if (backupData) {
      // 資料現在由獨立的 Listener 即時同步，取消時不需要手動還原 dbData
      setHomeBlocks(backupData.homeBlocks);
      setHeaderTitle(backupData.headerTitle);
      setHeaderSubtitle(backupData.headerSubtitle);
      setHeaderDescription(backupData.headerDescription);
      setFooterTaxLabel(backupData.footerTaxLabel);
      setFooterTaxId(backupData.footerTaxId);
      setFooterCopyright(backupData.footerCopyright);
      setFooterScrollText(backupData.footerScrollText);
      setGroupFontSize(backupData.groupFontSize);
      setItemFontSize(backupData.itemFontSize);
      setSectionFontSize(backupData.sectionFontSize);
      setContentFontSize(backupData.contentFontSize);
      setLinkFontSize(backupData.linkFontSize);
    }
    setIsEditMode(false);
    setBackupData(null);
  };

  const handleEditToggle = async () => {
    if (isEditMode) {
      if (!user) {
        alert('登入狀態已失效，請重新整理頁面報備。');
        return;
      }

      const configData = {
        headerTitle,
        headerSubtitle,
        headerDescription,
        footerTaxLabel,
        footerTaxId,
        footerCopyright,
        footerScrollText,
        groupFontSize,
        itemFontSize,
        sectionFontSize,
        contentFontSize,
        linkFontSize,
        detailTitleFontSize
      };

      const homeData = { homeBlocks };

      // 體積檢查
      const homeSize = getObjectSize(homeData);
      if (homeSize > 950000) { 
        alert(`【儲存失敗：內容過大】\n首頁內容約 ${Math.round(homeSize/1024)}KB，已達到單筆資料上限。請刪除一些首頁圖片。`);
        return;
      }

      setLoadingText('正在建立安全連線...');
      setIsUploading(true);

      const timeoutVal = 10000; // 10 秒即逾時
      const saveWithTimeout = (promise: any, msg: string) => 
        Promise.race([
          promise,
          new Promise((_, reject) => setTimeout(() => reject(new Error(`${msg} (連線超時)`)), timeoutVal))
        ]);

      try {
        setLoadingText('正在備份目前設定 (1/2)...');
        await saveWithTimeout(setDoc(doc(db, 'config', 'general'), configData), '儲存基礎設定失敗');
        
        setLoadingText('正在儲存首頁內容 (2/2)...');
        await saveWithTimeout(setDoc(doc(db, 'config', 'home'), homeData), '儲存首頁內容失敗');
        
        setIsEditMode(false);
        setBackupData(null);
        alert('儲存成功！已更新所有設定。');
      } catch (err: any) {
        console.error("Save failed:", err);
        if (err.message?.includes('超時')) {
          alert('【儲存逾時】\n伺服器回應太慢。請嘗試：\n1. 重新整理頁面再儲存。\n2. 檢查網路是否穩定。');
        } else if (err.message?.includes('too large') || err.message?.includes('1048576')) {
          alert('【內容過大】\n單次儲存不能超過 1MB (包含所有圖片)。請減少首頁內容。');
        } else {
          handleFirestoreError(err, 'saveConfig');
        }
      } finally {
        setIsUploading(false);
        setLoadingText('正在處理中...');
      }
    } else {
      setShowPasswordModal(true);
      setPasswordInput('');
      setPasswordError(false);
    }
  };

  const isRecent = (timestamp) => {
    if (!timestamp) return false;
    const threeDaysInMs = 3 * 24 * 60 * 60 * 1000;
    return (Date.now() - timestamp) < threeDaysInMs;
  };

  // --- Home Blocks Actions ---
  const addHomeBlock = (type) => {
    setHomeBlocks([...homeBlocks, { 
      id: `hb${Date.now()}`, 
      type, 
      content: type === 'text' ? '' : '新連結按鈕', 
      url: type === 'link' ? '#' : '' 
    }]);
  };

  const updateHomeBlock = (idx, field, val) => {
    const newBlocks = [...homeBlocks];
    newBlocks[idx][field] = val;
    setHomeBlocks(newBlocks);
  };

  const deleteHomeBlock = (idx) => {
    const newBlocks = [...homeBlocks];
    newBlocks.splice(idx, 1);
    setHomeBlocks(newBlocks);
  };

  const moveHomeBlock = (idx, direction) => {
    const newBlocks = [...homeBlocks];
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target < 0 || target >= newBlocks.length) return;
    [newBlocks[idx], newBlocks[target]] = [newBlocks[target], newBlocks[idx]];
    setHomeBlocks(newBlocks);
  };

  // --- DB Actions ---
  // --- DB Actions (Firestore) ---
  const updateGroupTitle = async (groupId, val) => { 
    try {
      const group = dbData.find(g => g.id === groupId);
      if (group?.group === val) return;
      
      console.log(`[Firestore Write] updateGroupTitle: ${groupId}`);
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, { group: val });
    } catch (error) {
      handleFirestoreError(error, 'updateGroupTitle');
    }
  };

  const updateGroupProp = async (groupId, prop, val) => {
    try {
      const group = dbData.find(g => g.id === groupId);
      if (group?.[prop] === val) return;

      console.log(`[Firestore Write] updateGroupProp: ${groupId}, ${prop}`);
      const groupRef = doc(db, 'groups', groupId);
      await updateDoc(groupRef, { [prop]: val });
    } catch (error) {
      handleFirestoreError(error, 'updateGroupProp');
    }
  };
  
  const updateItemTitle = async (groupId, itemId, val) => { 
    try {
      const item = dbData.find(g => g.id === groupId)?.items.find(i => i.id === itemId);
      if (item?.title === val) return;

      console.log(`[Firestore Write] updateItemTitle: ${itemId}`);
      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, { title: val, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, 'updateItemTitle');
    }
  };

  const updateItemProp = async (itemId, prop, val) => {
    try {
      // Find item in all groups
      let existingVal = undefined;
      for (const g of dbData) {
        const item = g.items.find(i => i.id === itemId);
        if (item) {
          existingVal = item[prop];
          break;
        }
      }
      if (existingVal === val) return;

      console.log(`[Firestore Write] updateItemProp: ${itemId}, ${prop}`);
      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, { [prop]: val, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, 'updateItemProp');
    }
  };

  const toggleItemBadge = async (groupId, itemId, e) => {
    e?.stopPropagation();
    try {
      const item = dbData.find(g => g.id === groupId)?.items.find(i => i.id === itemId);
      if (item) {
        console.log(`[Firestore Write] toggleItemBadge: ${itemId}`);
        const itemRef = doc(db, 'items', itemId);
        await updateDoc(itemRef, { showBadge: !item.showBadge });
      }
    } catch (error) {
      handleFirestoreError(error, 'toggleItemBadge');
    }
  };

  const updateSectionTitle = async (gIdx, iIdx, sIdx, val) => { 
    try {
      const section = dbData[gIdx].items[iIdx].content[sIdx];
      if (section.title === val) return;

      console.log(`[Firestore Write] updateSectionTitle: ${section.id}`);
      const sectionRef = doc(db, 'sections', section.id);
      await updateDoc(sectionRef, { title: val });
      await touchItem(gIdx, iIdx);
    } catch (error) {
      handleFirestoreError(error, 'updateSectionTitle');
    }
  };

  const [isUploading, setIsUploading] = useState(false);

  // 移動項目到不同分類
  const moveItemToGroup = async (itemId, newGroupId) => {
    try {
      const itemRef = doc(db, 'items', itemId);
      
      // 獲取目標分類中目前最高的 order，以便放到最後面
      let maxOrder = 0;
      dbData.find(g => g.id === newGroupId)?.items.forEach(i => {
        if (i.order > maxOrder) maxOrder = i.order;
      });

      await updateDoc(itemRef, { 
        groupId: newGroupId,
        order: maxOrder + 1,
        updatedAt: Date.now()
      });
      
      // 如果移動的是當前開啟的項目，關閉它以避免資料混亂
      if (activeId === itemId) {
        setActiveId(null);
      }
    } catch (error) {
      handleFirestoreError(error, 'moveItemToGroup');
    }
  };

  const updateBlockValue = async (sectionId, bIdx, val) => { 
    try {
      const sectionRef = doc(db, 'sections', sectionId);
      const sectionSnap = await getDoc(sectionRef);
      if (sectionSnap.exists()) {
        const data = sectionSnap.data();
        const newItems = [...(data.items || [])];
        if (newItems[bIdx]) {
          if (newItems[bIdx].value === val) return;

          newItems[bIdx] = { ...newItems[bIdx], value: val };
          
          console.log(`[Firestore Write] updateBlockValue: ${sectionId}, block: ${bIdx}`);
          await updateDoc(sectionRef, { items: newItems });
          
          const itemId = data.itemId;
          if (itemId) {
            const itemRef = doc(db, 'items', itemId);
            await updateDoc(itemRef, { updatedAt: Date.now() });
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, 'updateBlockValue');
    }
  };

  const updateBlockProp = async (sectionId, bIdx, prop, val) => { 
    try {
      const sectionRef = doc(db, 'sections', sectionId);
      const sectionSnap = await getDoc(sectionRef);
      if (sectionSnap.exists()) {
        const data = sectionSnap.data();
        const newItems = [...(data.items || [])];
        if (newItems[bIdx]) {
          if (newItems[bIdx][prop] === val) return;

          newItems[bIdx] = { ...newItems[bIdx], [prop]: val };
          console.log(`[Firestore Write] updateBlockProp: ${sectionId}, block: ${bIdx}, prop: ${prop}`);
          await updateDoc(sectionRef, { items: newItems });
        }
      }
    } catch (error) {
      handleFirestoreError(error, 'updateBlockProp');
    }
  };

  const updateLinkVal = async (gIdx, iIdx, sIdx, lIdx, key, val) => { 
    try {
      const section = dbData[gIdx].items[iIdx].content[sIdx];
      if (section.links[lIdx]?.[key] === val) return;

      const newLinks = section.links.map((ln, idx) => 
        idx === lIdx ? { ...ln, [key]: val } : ln
      );
      
      console.log(`[Firestore Write] updateLinkVal: ${section.id}, link: ${lIdx}`);
      const sectionRef = doc(db, 'sections', section.id);
      await updateDoc(sectionRef, { links: newLinks });
      await touchItem(gIdx, iIdx);
    } catch (error) {
      handleFirestoreError(error, 'updateLinkVal');
    }
  };

  const addDetailLink = async (gIdx, iIdx, sIdx) => {
    try {
      const section = dbData[gIdx].items[iIdx].content[sIdx];
      const newLinks = [...(section.links || [])];
      newLinks.push({ label: '新連結', url: 'https://' });
      const sectionRef = doc(db, 'sections', section.id);
      await updateDoc(sectionRef, { links: newLinks });
      await touchItem(gIdx, iIdx);
    } catch (error) {
      handleFirestoreError(error, 'addDetailLink');
    }
  };

  const addItem = async (groupId, e) => {
    try {
      e.stopPropagation();
      const itemId = `i${Date.now()}`;
      const group = dbData.find(g => g.id === groupId);
      const order = group?.items.length || 0;
      
      await setDoc(doc(db, 'items', itemId), {
        id: itemId,
        groupId: groupId,
        title: '新項目',
        icon: 'FileText',
        updatedAt: Date.now(),
        order
      });
    } catch (error) {
      handleFirestoreError(error, 'addItem');
    }
  };

  const handleImageUpload = (sectionId, bIdx, e) => {
    const file = e.target.files[0];
    if (file) {
      setLoadingText('正在優化圖片體積...');
      setIsUploading(true);
      const reader = new FileReader();
      reader.onloadend = async () => {
        if (typeof reader.result === 'string') {
          try {
            // 超過 200K (200 * 1024 bytes) 才進行壓縮，否則直接使用原圖
            const finalImage = file.size > 200 * 1024
              ? await compressImage(reader.result)
              : reader.result;
            await updateBlockValue(sectionId, bIdx, finalImage);
          } catch (err) {
            console.error("Upload process failed:", err);
          } finally {
            setIsUploading(false);
          }
        } else {
          setIsUploading(false);
        }
      };
      reader.onerror = () => setIsUploading(false);
      reader.readAsDataURL(file);
    }
  };

  const handleImagePaste = (sectionId, bIdx, e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        setLoadingText('正在處理剪貼簿圖片...');
        setIsUploading(true);
        const file = items[i].getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onloadend = async () => {
            if (typeof reader.result === 'string') {
              try {
                // 超過 200K (200 * 1024 bytes) 才進行壓縮，否則直接使用原圖
                const finalImage = file.size > 200 * 1024
                  ? await compressImage(reader.result)
                  : reader.result;
                await updateBlockValue(sectionId, bIdx, finalImage);
              } catch (err) {
                console.error("Paste process failed:", err);
              } finally {
                setIsUploading(false);
              }
            } else {
              setIsUploading(false);
            }
          };
          reader.onerror = () => setIsUploading(false);
          reader.readAsDataURL(file);
          e.preventDefault();
        }
      }
    }
  };

  const deleteItem = async (groupId, itemId, e) => {
    try {
      e.stopPropagation();
      await deleteDoc(doc(db, 'items', itemId));
      // Also delete sections
      const sectionsToDelete = dbData.find(g => g.id === groupId)?.items.find(i => i.id === itemId)?.content || [];
      for (const sec of sectionsToDelete) {
        await deleteDoc(doc(db, 'sections', sec.id));
      }
    } catch (error) {
       handleFirestoreError(error, 'deleteItem');
    }
  };

  const addGroup = async () => {
    try {
      const id = `g${Date.now()}`;
      const order = dbData.length;
      await setDoc(doc(db, 'groups', id), {
        id,
        group: '新群組',
        description: '',
        order
      });
      setExpandedGroups(prev => ({ ...prev, [id]: true }));
    } catch (error) {
      handleFirestoreError(error, 'addGroup');
    }
  };

  const deleteGroup = async (groupId, e) => { 
    try {
      e.stopPropagation(); 
      const group = dbData.find(g => g.id === groupId);
      if (!group) return;
      
      const itemsToDelete = group.items || [];
      // Use Batch for deletion of groups/items/sections would be safer but complex here
      await deleteDoc(doc(db, 'groups', groupId));
      for (const item of itemsToDelete) {
        await deleteItem(groupId, item.id, e);
      }
    } catch (error) {
      handleFirestoreError(error, 'deleteGroup');
    }
  };

  const addBigSection = async (gIdx, iIdx, type = 'list') => {
    try {
      const item = dbData[gIdx].items[iIdx];
      const sectionId = `s${Date.now()}`;
      const order = item.content.length;
      
      await setDoc(doc(db, 'sections', sectionId), {
        id: sectionId,
        itemId: item.id,
        title: type === 'important' ? '新重要大區塊' : '新一般大區塊',
        type: type,
        items: [{id: `b${Date.now()}`, type:'text', value:'請輸入內容...'}],
        links: [],
        order
      });
      await touchItem(gIdx, iIdx);
    } catch (error) {
      handleFirestoreError(error, 'addBigSection');
    }
  };

  const toggleSectionType = async (gIdx, iIdx, sIdx) => {
    try {
      const section = dbData[gIdx].items[iIdx].content[sIdx];
      const types = ['list', 'important', 'steps', 'details'];
      const nextIdx = (types.indexOf(section.type) + 1) % types.length;
      
      await updateDoc(doc(db, 'sections', section.id), {
        type: types[nextIdx]
      });
      await touchItem(gIdx, iIdx);
    } catch (error) {
      handleFirestoreError(error, 'toggleSectionType');
    }
  };

  const moveGroup = async (groupId, direction, e) => {
    try {
      e.stopPropagation();
      const gIdx = dbData.findIndex(g => g.id === groupId);
      if (gIdx === -1) return;
      
      const target = (direction === 'up' || direction === 'left') ? gIdx - 1 : gIdx + 1;
      if (target < 0 || target >= dbData.length) return;

      const batch = writeBatch(db);
      batch.update(doc(db, 'groups', dbData[gIdx].id), { order: target });
      batch.update(doc(db, 'groups', dbData[target].id), { order: gIdx });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'moveGroup');
    }
  };

  const moveItem = async (groupId, itemId, direction, e) => {
    try {
      e.stopPropagation();
      const group = dbData.find(g => g.id === groupId);
      if (!group) return;
      
      const items = group.items;
      const iIdx = items.findIndex(i => i.id === itemId);
      if (iIdx === -1) return;

      const target = direction === 'up' ? iIdx - 1 : iIdx + 1;
      if (target < 0 || target >= items.length) return;

      const batch = writeBatch(db);
      batch.update(doc(db, 'items', items[iIdx].id), { order: target });
      batch.update(doc(db, 'items', items[target].id), { order: iIdx });
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, 'moveItem');
    }
  };

  const addSmallBlock = async (gIdx, iIdx, sIdx, type) => {
    try {
      const section = dbData[gIdx].items[iIdx].content[sIdx];
      const newItems = [...(section.items || [])];
      newItems.push({ id: `b${Date.now()}`, type, value: type === 'text' ? '新文字段落...' : '' });
      await updateDoc(doc(db, 'sections', section.id), {
        items: newItems
      });
      await touchItem(gIdx, iIdx);
    } catch (error) {
      handleFirestoreError(error, 'addSmallBlock');
    }
  };

  const toggleBold = async (gIdx, iIdx, sIdx, arrayIdx) => {
    try {
      const section = dbData[gIdx].items[iIdx].content[sIdx];
      const newItems = section.items.map((it, idx) => 
        idx === arrayIdx ? { ...it, isBold: !it.isBold } : it
      );
      await updateDoc(doc(db, 'sections', section.id), {
        items: newItems
      });
      await touchItem(gIdx, iIdx);
    } catch (error) {
      handleFirestoreError(error, 'toggleBold');
    }
  };

  const moveSection = async (gIdx, iIdx, sIdx, direction) => {
    try {
      const content = dbData[gIdx].items[iIdx].content;
      const target = direction === 'up' ? sIdx - 1 : sIdx + 1;
      if (target < 0 || target >= content.length) return;

      const batch = writeBatch(db);
      batch.update(doc(db, 'sections', content[sIdx].id), { order: target });
      batch.update(doc(db, 'sections', content[target].id), { order: sIdx });
      await batch.commit();
      await touchItem(gIdx, iIdx);
    } catch (error) {
      handleFirestoreError(error, 'moveSection');
    }
  };

  const deleteSection = async (gIdx, iIdx, sIdx) => {
    try {
      const section = dbData[gIdx].items[iIdx].content[sIdx];
      await deleteDoc(doc(db, 'sections', section.id));
      await touchItem(gIdx, iIdx);
    } catch (error) {
      handleFirestoreError(error, 'deleteSection');
    }
  };

  const moveBlock = async (gIdx, iIdx, sIdx, bIdx, direction) => {
    try {
      const section = dbData[gIdx].items[iIdx].content[sIdx];
      const items = [...(section.items || [])];
      const target = direction === 'up' ? bIdx - 1 : bIdx + 1;
      if (target < 0 || target >= items.length) return;
      [items[bIdx], items[target]] = [items[target], items[bIdx]];
      await updateDoc(doc(db, 'sections', section.id), { items });
      await touchItem(gIdx, iIdx);
    } catch (error) {
      handleFirestoreError(error, 'moveBlock');
    }
  };

  const deleteBlock = async (gIdx, iIdx, sIdx, bIdx) => {
    try {
      const section = dbData[gIdx].items[iIdx].content[sIdx];
      const newItems = [...(section.items || [])];
      newItems.splice(bIdx, 1);
      await updateDoc(doc(db, 'sections', section.id), {
        items: newItems
      });
      await touchItem(gIdx, iIdx);
    } catch (error) {
      handleFirestoreError(error, 'deleteBlock');
    }
  };

  const moveLink = async (gIdx, iIdx, sIdx, lIdx, direction) => {
    try {
      const section = dbData[gIdx].items[iIdx].content[sIdx];
      const target = direction === 'up' ? lIdx - 1 : lIdx + 1;
      const links = [...(section.links || [])];
      if (target < 0 || target >= links.length) return;
      [links[lIdx], links[target]] = [links[target], links[lIdx]];
      await updateDoc(doc(db, 'sections', section.id), { links });
      await touchItem(gIdx, iIdx);
    } catch (error) {
      handleFirestoreError(error, 'moveLink');
    }
  };

  const organizeWithAI = async () => {
    if (!aiInputText.trim() || !aiTargetGroupId) return;
    setIsOrganizing(true);

    try {
      const apiKey = (process.env.Web_Key || process.env.GEMINI_API_KEY)?.trim();
      
      // 檢查是否完全未設定
      if (!apiKey || apiKey === 'YOUR_API_KEY' || apiKey === 'Web_Key') {
        throw new Error("API Key 未設定。請點擊左側開發者工具中的『Settings』->『Secrets』，點擊『Add Secret』：\n1. Name 填入: Web_Key\n2. Value 填入: 您的 API Key (AIza...開頭串)\n完成後請按 Save。");
      }

      // 檢查是否填錯了變數名稱到 Value 欄位
      if (apiKey === 'MY_GEMINI_API_KEY' || apiKey === 'GEMINI_API_KEY' || !apiKey.startsWith('AIza')) {
        throw new Error(`設定錯誤：您在 Value 欄位填入了 "${apiKey}"。這裡不應該填變數名稱，而是要填入 API Key 本身（例如 AIzaSy... 開頭的一長串亂碼）。請回到 Settings -> Secrets 修改 Web_Key 的 Value。`);
      }
      
      const ai = new GoogleGenAI({ apiKey: apiKey });
      
      const prompt = `你是一個專業的文件整理助手。請將以下亂序或不完整的文字，整理成結構化的手冊內容。
      要求：
      1. 提取出一個合適的標題 (itemTitle)。
      2. 將內容分成數個章節 (sections)。
      3. 每個章節必須指定類型：'list' (一般清單), 'important' (注意事項/警示), 'steps' (步驟流程)。
      4. 內容盡可能精煉且結構化。

      待整理文字：
      ${aiInputText}`;

      const response = await ai.models.generateContent({ 
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              itemTitle: { type: Type.STRING },
              sections: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    type: { type: Type.STRING, enum: ["list", "important", "steps"] },
                    items: {
                      type: Type.ARRAY,
                      items: {
                        type: Type.OBJECT,
                        properties: {
                          type: { type: Type.STRING, enum: ["text"] },
                          value: { type: Type.STRING }
                        },
                        required: ["type", "value"]
                      }
                    }
                  },
                  required: ["title", "type", "items"]
                }
              }
            },
            required: ["itemTitle", "sections"]
          }
        }
      });

      const resText = response.text;
      if (!resText) throw new Error("AI 未返回任何內容");
      const structuredData = JSON.parse(resText);
      
      const groupId = aiTargetGroupId;
      const itemId = `i${Date.now()}`;
      const group = dbData.find(g => g.id === groupId);
      const order = group?.items.length || 0;

      const batch = writeBatch(db);
      batch.set(doc(db, 'items', itemId), {
        id: itemId,
        groupId: groupId,
        title: aiNewItemTitle.trim() || structuredData.itemTitle || 'AI 生成項目',
        icon: 'FileText',
        updatedAt: Date.now(),
        order
      });
      
      structuredData.sections.forEach((s, sIdx) => {
        const sectionId = `${itemId}_ai_${sIdx}`;
        batch.set(doc(db, 'sections', sectionId), {
          id: sectionId,
          itemId: itemId,
          title: s.title,
          type: s.type,
          items: (s.items || []).map((it, idx) => ({ ...it, id: `ai_b_${Date.now()}_${idx}` })),
          links: s.links || [],
          order: sIdx
        });
      });

      await batch.commit();
      setIsAiModalOpen(false);
      setAiInputText('');
      setAiNewItemTitle('');
      setAiTargetGroupId(null);
      alert('AI 整理完成並存入資料庫！');
    } catch (error) {
      console.error("AI Organizing failed:", error);
      handleFirestoreError(error, 'organizeWithAI');
    } finally {
      setIsOrganizing(false);
    }
  };

  const updateSectionIcon = async (gIdx, iIdx, icon) => {
    try {
      const item = dbData[gIdx].items[iIdx];
      await updateDoc(doc(db, 'items', item.id), {
        icon: icon
      });
    } catch (error) {
       handleFirestoreError(error, 'updateSectionIcon');
    }
  };

  // --- Derived Data ---
  const activeItemData = useMemo(() => {
    if (!activeId) return null;
    for (let g = 0; g < dbData.length; g++) {
      for (let i = 0; i < dbData[g].items.length; i++) {
        if (dbData[g].items[i].id === activeId) return { gIdx: g, iIdx: i, ...dbData[g].items[i] };
      }
    }
    return null;
  }, [activeId, dbData]);

  const filteredMenu = useMemo(() => {
    if (!searchTerm) return dbData;
    const term = searchTerm.toLowerCase();
    return dbData.map(g => {
      const groupMatches = g.group.toLowerCase().includes(term);
      const matchedItems = g.items.filter(item => {
        if (item.title.toLowerCase().includes(term)) return true;
        return item.content.some(sec => {
          if (sec.title.toLowerCase().includes(term)) return true;
          return sec.items.some(it => it.type === 'text' && it.value.toLowerCase().includes(term));
        });
      });
      if (groupMatches) return { ...g, items: g.items };
      else if (matchedItems.length > 0) return { ...g, items: matchedItems };
      return null;
    }).filter(g => g !== null);
  }, [searchTerm, dbData]);

  // Sync expanded state with search but don't force collapse when search is cleared
  // This allows manual accordion use to persist after clearing search
  useEffect(() => {
    if (searchTerm.trim()) {
      const newExpanded = {};
      filteredMenu.forEach(g => { newExpanded[g.id] = true; });
      setExpandedGroups(prev => ({ ...prev, ...newExpanded }));
    }
  }, [searchTerm, filteredMenu]);

  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo(0, 0);
    }

    if (activeId && searchTerm.trim() && mainScrollRef.current) {
      // 使用輪詢（Polling）方式，當 detail 視窗完成掛載且包含 mark 元素時，自動定位到第一個標註關鍵字的地方
      let attempts = 0;
      const interval = setInterval(() => {
        const firstMark = mainScrollRef.current?.querySelector('#resource-detail-view mark');
        if (firstMark) {
          firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
          clearInterval(interval);
        }
        attempts++;
        if (attempts > 40) { // 最多輪詢 2 秒 (40 * 50ms)
          clearInterval(interval);
        }
      }, 50);
      return () => clearInterval(interval);
    }
  }, [activeId, searchTerm]);

  return (
    <div className="h-screen flex flex-col font-sans text-slate-900 bg-slate-50 overflow-hidden selection:bg-indigo-600/10 relative">
      {/* Background Decorative Elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-indigo-200 blur-[120px] rounded-full"></div>
        <div className="absolute top-[20%] -right-[5%] w-[30%] h-[30%] bg-blue-100 blur-[100px] rounded-full"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>
      </div>
      
      {/* 密碼驗證視窗 */}
      <AnimatePresence>
        {isUploading && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-slate-900/40 backdrop-blur-md flex flex-col items-center justify-center gap-6 p-4"
          >
             <div className="w-16 h-16 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
             <div className="bg-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-2 max-w-sm text-center">
               <span className="text-xl font-black text-slate-900">{loadingText}</span>
               <div className="flex flex-col gap-1">
                 <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">系統處理中，請勿關閉視窗</span>
                 <p className="text-[10px] text-slate-400 leading-relaxed font-medium">若首頁包含多張高畫質圖片，傳輸可能需要較長時間。請耐心等候。</p>
               </div>
               
               {/* 當儲存顯然卡住時的逃生按鈕 */}
               <button 
                 onClick={() => {
                   if (window.confirm('確定要中止儲存嗎？這可能會導致部分資料未成功上傳，但可以讓您重新嘗試。')) {
                     setIsUploading(false);
                   }
                 }}
                 className="mt-4 px-4 py-2 text-[10px] font-bold text-slate-300 hover:text-indigo-600 transition-colors uppercase tracking-widest border border-slate-100 rounded-lg"
               >
                 如果卡住超過 30 秒，按此取消並重試
               </button>
             </div>
          </motion.div>
        )}

        {showPasswordModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-10 w-full max-w-sm shadow-2xl text-center"
            >
              <div className="p-4 bg-indigo-50 text-indigo-600 rounded-xl mb-4 mx-auto inline-block"> <Lock size={32}/> </div>
              <h3 className="text-xl font-bold text-slate-900 tracking-tight mt-2">身分驗證</h3>
              <p className="text-xs text-slate-500 font-medium tracking-widest uppercase mb-8">請輸入管理密碼進入編輯</p>
              <input autoFocus type="password" 
                className={`w-full bg-slate-50 border ${passwordError ? 'border-red-500 ring-2 ring-red-500/20' : 'border-slate-200'} rounded-xl py-4 px-6 text-center text-slate-900 font-black tracking-[0.5em] outline-none transition-all placeholder:text-slate-400 mb-2 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20`}
                placeholder="••••" value={passwordInput}
                onChange={(e) => { setPasswordInput(e.target.value); setPasswordError(false); }}
                onKeyDown={(e) => e.key === 'Enter' && verifyPassword()}
              />
              {passwordError && <p className="text-[10px] text-red-500 font-bold uppercase tracking-widest mb-4">密碼錯誤，請再試一次</p>}
              <div className="grid grid-cols-2 gap-4 w-full mt-6">
                <button onClick={() => setShowPasswordModal(false)} className="py-3.5 px-6 rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors font-bold text-[10px] uppercase tracking-widest text-center">取消</button>
                <button onClick={verifyPassword} className="py-3.5 px-6 rounded-xl bg-indigo-600 hover:bg-indigo-700 transition-colors text-white font-bold text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-200">驗證</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <nav className={`p-3 px-6 flex justify-between items-center z-[70] sticky top-0 border-b transition-all duration-300 ${isEditMode ? 'bg-white/90 border-indigo-100 shadow-sm backdrop-blur-md' : 'bg-white/90 border-slate-200 shadow-sm backdrop-blur-md'}`}>
        <div className="flex items-center gap-4">
          <motion.div 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center cursor-pointer px-1" 
            onClick={() => { setActiveId(null); setSearchTerm(''); }}
          >
            <div className={`w-8 h-8 rounded flex items-center justify-center mr-3 transition-colors ${isEditMode ? 'bg-indigo-100 text-indigo-700 border border-indigo-200' : 'bg-indigo-600 text-white shadow-md'}`}> <Layers size={16}/> </div>
            {isEditMode ? (
                <DebouncedInput className="bg-transparent text-slate-900 font-bold text-sm border-b border-indigo-300 focus:border-indigo-600 px-2 py-1 rounded w-48 outline-none transition-colors" value={headerTitle} onChange={(val) => setHeaderTitle(val)} />
            ) : ( <h1 className="font-bold text-xl tracking-tight text-slate-800 uppercase leading-none">{headerTitle}</h1> )}
          </motion.div>
          {user && (
            <div className="relative flex items-center pl-4 border-l border-slate-200">
               <button 
                 onClick={() => setShowUserMenu(!showUserMenu)}
                 className="flex items-center gap-2 hover:opacity-80 transition-opacity"
               >
                 <img referrerPolicy="no-referrer" src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-indigo-100" />
                 <span className="hidden sm:block text-left">
                    <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{user.displayName}</span>
                    <span className="block text-[9px] text-slate-300 font-bold leading-none mt-1">Administrator</span>
                 </span>
               </button>

               <AnimatePresence>
                 {showUserMenu && (
                   <>
                     <div 
                       className="fixed inset-0 z-10" 
                       onClick={() => setShowUserMenu(false)} 
                     />
                     <motion.div
                       initial={{ opacity: 0, y: 10, scale: 0.95 }}
                       animate={{ opacity: 1, y: 0, scale: 1 }}
                       exit={{ opacity: 0, y: 10, scale: 0.95 }}
                       className="absolute top-full left-4 mt-2 w-32 bg-white rounded-xl shadow-xl border border-slate-100 p-1 z-20"
                     >
                       <button 
                         onClick={() => {
                           logout();
                           setShowUserMenu(false);
                         }}
                         className="w-full flex items-center gap-2 px-3 py-2 text-red-500 hover:bg-red-50 rounded-lg text-xs font-bold transition-all transition-colors"
                       >
                         <LogOut size={14}/> 登出系統
                       </button>
                     </motion.div>
                   </>
                 )}
               </AnimatePresence>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isEditMode && (
            <button 
              onClick={cancelEdit} 
              className="flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold tracking-tight bg-white border border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200 transition-all shadow-sm"
            >
              取消編輯
            </button>
          )}
          {user && user.email === ADMIN_EMAIL ? (
            <button 
              onClick={handleEditToggle} 
              disabled={isUploading}
              className={`flex items-center gap-2 px-6 py-2 rounded-full text-xs font-bold tracking-tight transition-all ${isUploading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : isEditMode ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700' : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-indigo-600 hover:text-white'}`}
            >
              {isUploading ? (
                <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
              ) : isEditMode ? (
                <Save size={14}/>
              ) : null}
              {isUploading ? '處理中...' : isEditMode ? '完成並儲存' : 'ADMIN'}
            </button>
          ) : !user ? (
            <button 
              onClick={() => { setShowPasswordModal(true); setPasswordInput(''); setPasswordError(false); }} 
              className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all"
              title="登入管理"
            >
              <UserIcon size={16}/>
            </button>
          ) : null}
        </div>
      </nav>

      {/* Edit Controls */}
      {isEditMode && (
        <aside className="bg-white border-b border-slate-200 px-6 py-2 flex flex-col z-[60] relative shadow-sm">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setShowFontControls(!showFontControls)}
              className="flex items-center gap-2 text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"
            >
              <Settings size={14}/> {showFontControls ? '收起字體設定' : '展開字體設定'}
            </button>
            <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest hidden sm:block">編輯模式已啟用</div>
          </div>

          <AnimatePresence>
            {showFontControls && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-x-8 gap-y-4 py-4 pt-2 border-t border-slate-50 mt-2">
                  {/* 資料庫審計與統計 */}
                  {(() => {
                    const allImages = sections.flatMap(s => s.items || []).filter(it => it.type === 'image' && it.value);
                    const homeImages = homeBlocks.filter(b => b.type === 'image' && b.content);
                    const totalImageSize = allImages.reduce((acc, it) => acc + (it.value.length || 0), 0) + 
                                          homeImages.reduce((acc, it) => acc + (it.content.length || 0), 0);
                    
                    const totalDocSize = JSON.stringify({ groups, items, sections, homeBlocks }).length;
                    
                    // 找出孤兒區塊 (itemId 不存在的 sections)
                    const orphanedSections = sections.filter(s => !items.find(i => i.id === s.itemId));
                    
                    const handleCleanup = async () => {
                      if (!window.confirm(`確定要清理 ${orphanedSections.length} 個孤立區塊嗎？這些是因刪除項目後殘留的資料，刪除後可釋放空間。`)) return;
                      setIsUploading(true);
                      setLoadingText('正在清理資料庫...');
                      try {
                        const batch = writeBatch(db);
                        orphanedSections.forEach(s => {
                          batch.delete(doc(db, 'sections', s.id));
                        });
                        await batch.commit();
                        alert(`清理完成！已刪除 ${orphanedSections.length} 個遺留區塊。`);
                      } catch (err) {
                        handleFirestoreError(err, 'cleanupOrphans');
                      } finally {
                        setIsUploading(false);
                      }
                    };

                    const sortedImages = [...allImages.map(i => ({...i, source: '內容'}))];
                    homeImages.forEach(hi => sortedImages.push({ id: hi.id, value: hi.content, source: '首頁' } as any));
                    sortedImages.sort((a, b) => (b.value?.length || 0) - (a.value?.length || 0));

                    return (
                      <div className="flex flex-wrap items-center gap-4 border-r border-slate-100 pr-8">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                             <ImageIcon size={14} className="text-indigo-400" />
                             <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                               圖片總量: <span className={totalImageSize > 800000 ? 'text-amber-600' : 'text-indigo-600'}>{(totalImageSize / (1024 * 1024)).toFixed(2)} MB</span>
                             </span>
                          </div>
                          <div className="flex items-center gap-2">
                             <Layers size={14} className="text-slate-300" />
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                               運作資料: {(totalDocSize / 1024).toFixed(0)} KB
                             </span>
                          </div>
                        </div>
                        
                        {sortedImages.length > 0 && (
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <AlertCircle size={14} className="text-amber-400" />
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none">
                                最大圖片: <span className="text-indigo-600 font-mono">{(sortedImages[0].value.length / 1024).toFixed(0)} KB</span>
                                <span className="ml-1 text-[8px] text-slate-300">({sortedImages[0].source})</span>
                              </span>
                            </div>
                            {orphanedSections.length > 0 && (
                              <button 
                                onClick={handleCleanup}
                                className="flex items-center gap-1 group/cleanup"
                              >
                                <Trash2 size={10} className="text-red-400 group-hover/cleanup:text-red-600" />
                                <span className="text-[9px] font-black text-red-400 group-hover/cleanup:text-red-600 underline">
                                  發現 {orphanedSections.length} 個遺留垃圾 (請點此清理)
                                </span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">內容標題:</span>
                    <input type="range" min="16" max="64" value={detailTitleFontSize} onChange={(e) => setDetailTitleFontSize(parseInt(e.target.value))} className="w-20 accent-indigo-600 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer" />
                    <span className="text-indigo-600 font-mono text-[10px] w-6">{detailTitleFontSize}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">收合項目:</span>
                    <input type="range" min="14" max="32" value={groupFontSize} onChange={(e) => setGroupFontSize(parseInt(e.target.value))} className="w-20 accent-indigo-600 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer" />
                    <span className="text-indigo-600 font-mono text-[10px] w-6">{groupFontSize}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">子項目:</span>
                    <input type="range" min="12" max="28" value={itemFontSize} onChange={(e) => setItemFontSize(parseInt(e.target.value))} className="w-20 accent-indigo-600 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer" />
                    <span className="text-indigo-600 font-mono text-[10px] w-6">{itemFontSize}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">標題層級:</span>
                    <input type="range" min="14" max="36" value={sectionFontSize} onChange={(e) => setSectionFontSize(parseInt(e.target.value))} className="w-20 accent-indigo-600 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer" />
                    <span className="text-indigo-600 font-mono text-[10px] w-6">{sectionFontSize}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">內容文字:</span>
                    <input type="range" min="12" max="28" value={contentFontSize} onChange={(e) => setContentFontSize(parseInt(e.target.value))} className="w-20 accent-indigo-600 h-1.5 bg-slate-100 rounded-full appearance-none cursor-pointer" />
                    <span className="text-indigo-600 font-mono text-[10px] w-6">{contentFontSize}</span>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      )}

      {/* Main Content */}
      <main ref={mainScrollRef} className="flex-grow overflow-y-auto custom-scrollbar">
        <div className="max-w-[1200px] mx-auto p-6 md:p-12 pb-32">
          
          <AnimatePresence mode="wait">
            {!activeId ? (
              <motion.div 
                key="home"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-8"
              >
                {/* Modern Asymmetric Hero Section */}
                <section className="relative group">
                  <div className="absolute -inset-4 bg-indigo-500/5 blur-3xl rounded-[3rem] opacity-0 group-hover:opacity-100 transition-opacity duration-1000"></div>
                  <div className="relative bg-slate-900 rounded-[1.5rem] overflow-hidden border border-slate-800 shadow-2xl flex flex-col lg:flex-row items-center">
                    {/* Left: Branding & Message */}
                    <div className="flex-grow px-10 py-4 lg:px-16 lg:py-6 space-y-3 lg:border-r lg:border-slate-800">
                      <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 bg-indigo-500/10 text-indigo-400 text-[9px] font-bold tracking-[0.2em] uppercase border border-indigo-500/20 px-3 py-1 rounded-full"
                      >
                        <Layers size={10}/>
                        {isEditMode ? (
                          <DebouncedInput 
                            className="bg-transparent text-indigo-400 outline-none w-32"
                            value={headerSubtitle}
                            onChange={(val) => setHeaderSubtitle(val)}
                          />
                        ) : (
                          <span>{headerSubtitle}</span>
                        )}
                      </motion.div>
                      <div className="space-y-1">
                        {isEditMode ? (
                          <div className="space-y-2">
                            <DebouncedInput 
                              className="bg-slate-800 text-white text-xl lg:text-2xl font-black rounded px-3 py-1 outline-none border border-indigo-400/50 w-full"
                              value={headerTitle}
                              onChange={(val) => setHeaderTitle(val)}
                            />
                            <DebouncedInput 
                              className="bg-slate-800 text-slate-400 text-xs rounded px-3 py-1 outline-none border border-slate-700 w-full"
                              value={headerDescription}
                              onChange={(val) => setHeaderDescription(val)}
                            />
                          </div>
                        ) : (
                          <h2 className="text-2xl lg:text-3xl font-black text-white tracking-tighter leading-none">
                            {headerTitle.includes(' ') ? (
                              <>
                                {headerTitle.split(' ')[0]} <span className="text-indigo-400">{headerTitle.split(' ').slice(1).join(' ')}</span>
                              </>
                            ) : headerTitle}
                          </h2>
                        )}
                        {!isEditMode && (
                          <p className="text-slate-400 text-xs max-w-sm leading-relaxed font-medium">
                            {headerDescription}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Right: Search Integration */}
                    <div className="w-full lg:w-[400px] px-10 py-4 lg:px-16 lg:py-6 bg-white/5 backdrop-blur-xl flex flex-col justify-center">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest ml-1">快速查詢資源</label>
                        <div className="relative group/search">
                          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className="text-slate-500 group-focus-within/search:text-indigo-400 transition-colors" size={16}/>
                          </div>
                          <input 
                            type="text" 
                            placeholder="輸入關鍵字..." 
                            className="w-full bg-white/10 border border-white/10 rounded-lg py-2 pl-12 pr-4 text-sm text-white outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-600 shadow-inner"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                          />
                        </div>
                        <div className="flex flex-wrap gap-2 px-1">
                          {['報帳', '出差', '福利'].map(tag => (
                            <button 
                              key={tag} 
                              onClick={() => setSearchTerm(tag)}
                              className="text-[10px] font-bold text-slate-600 hover:text-indigo-400 transition-colors"
                            >
                              #{tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                {/* Home Blocks Feature */}
                {(homeBlocks.length > 0 || isEditMode) && (
                   <div className="space-y-8 pb-12 border-b border-slate-200">
                      <div className="text-center">
                         <h4 className="text-sm font-bold text-slate-400 uppercase tracking-[0.3em]">重要公告與快捷連結</h4>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {homeBlocks.map((block, idx) => (
                           <motion.div 
                            key={block.id}
                            layout
                            className={`relative group/hb border rounded-2xl transition-all ${
                               block.type === 'text' 
                                 ? `bg-white border-slate-200 shadow-sm text-slate-700 ${isEditMode ? 'p-6' : 'p-2.5'}` 
                                 : `bg-white border-orange-500 text-slate-700 shadow-sm ${isEditMode ? 'p-6' : 'p-1.5'}`
                             }`}
                           >
                              {isEditMode ? (
                                <div className="space-y-4">
                                  <div className="flex justify-between items-center mb-2">
                                     <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">{block.type === 'text' ? '文字公告' : '快捷連結'}</span>
                                     <div className="flex gap-2 text-slate-400">
                                        <button onClick={(e) => { e.stopPropagation(); moveHomeBlock(idx, 'up'); }} className="p-1 hover:text-indigo-400 transition-colors"><ArrowUp size={14}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); moveHomeBlock(idx, 'down'); }} className="p-1 hover:text-indigo-400 transition-colors"><ArrowDown size={14}/></button>
                                        <button onClick={(e) => { e.stopPropagation(); deleteHomeBlock(idx); }} className="p-1 hover:text-red-400 transition-colors"><TrashIcon size={14}/></button>
                                     </div>
                                  </div>
                                  {block.type === 'text' ? (
                                    <DebouncedTextarea 
                                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                      value={block.content}
                                      onChange={(val) => updateHomeBlock(idx, 'content', val)}
                                      placeholder="請輸入公告內容..."
                                    />
                                  ) : (
                                    <div className="space-y-3">
                                      <DebouncedInput className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 placeholder:text-slate-400 outline-none text-sm font-bold" value={block.content} onChange={(val) => updateHomeBlock(idx, 'content', val)} placeholder="按鈕文字"/>
                                      <DebouncedInput className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-900 text-[10px] placeholder:text-slate-400 outline-none font-mono" value={block.url} onChange={(val) => updateHomeBlock(idx, 'url', val)} placeholder="https://..."/>
                                    </div>
                                  )}
                                </div>
                              ) : (
                                block.type === 'text' ? (
                                  <p className="whitespace-pre-wrap leading-relaxed text-sm font-medium px-1">{block.content}</p>
                                ) : (
                                  <a href={block.url} target="_blank" rel="noreferrer" className="flex items-center justify-between w-full group/btn px-1">
                                     <div className="flex items-center gap-3">
                                        <div className="w-7 h-7 bg-orange-50 rounded flex items-center justify-center text-orange-500 group-hover/btn:bg-orange-500 group-hover/btn:text-white transition-all border border-orange-100">
                                           <Link2 size={14}/>
                                        </div>
                                        <span className="font-bold text-sm tracking-tight text-slate-800">{block.content}</span>
                                     </div>
                                     <div className="text-orange-300 group-hover/btn:text-orange-500 transition-colors">
                                        <ArrowRight size={16}/>
                                     </div>
                                  </a>
                                )
                              )}
                           </motion.div>
                        ))}
                      </div>
                      {isEditMode && (
                        <div className="flex justify-center gap-4">
                           <button onClick={() => addHomeBlock('text')} className="px-6 py-3 border border-slate-200 rounded-xl flex items-center gap-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-[10px] uppercase tracking-widest"><Plus size={14}/> 文字公告</button>
                           <button onClick={() => addHomeBlock('link')} className="px-6 py-3 border border-slate-200 rounded-xl flex items-center gap-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-all font-bold text-[10px] uppercase tracking-widest"><Link2 size={14}/> 快捷連結</button>
                        </div>
                      )}
                   </div>
                )}

                <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                    <h3 className="text-xl font-bold text-slate-800 tracking-tight text-shadow-sm">資源分類導航</h3>
                  </div>
                  <div className="flex items-center gap-4">
                    {isEditMode && !searchTerm && (
                      <button onClick={addGroup} className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 uppercase tracking-widest"><Plus size={14}/> 增加分類</button>
                    )}
                    {isEditMode && groups.length === 0 && (
                      <button onClick={seedDatabase} className="text-xs font-bold text-green-600 hover:text-green-800 flex items-center gap-1 uppercase tracking-widest outline-none"><Save size={14}/> 初始化資料</button>
                    )}
                  </div>
                </div>

                {/* Categories Grid - Synchronized stretching with flex h-full */}
                {!isSnapshotReady ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-[2rem] p-8 animate-pulse space-y-6">
                        <div className="w-12 h-12 bg-slate-100 rounded-2xl"></div>
                        <div className="space-y-3">
                          <div className="h-6 bg-slate-100 rounded-full w-3/4"></div>
                          <div className="h-4 bg-slate-100 rounded-full w-1/2"></div>
                        </div>
                        <div className="space-y-2 pt-4 border-t border-slate-50">
                          <div className="h-3 bg-slate-50 rounded-full w-full"></div>
                          <div className="h-3 bg-slate-50 rounded-full w-full"></div>
                          <div className="h-3 bg-slate-50 rounded-full w-2/3"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : groups.length === 0 && !searchTerm ? (
                  <div className="bg-white/50 border border-slate-200 rounded-[2rem] p-12 text-center space-y-4">
                    <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-full flex items-center justify-center mx-auto">
                      <Layers size={32}/>
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-600">尚未載入資料</h4>
                      <p className="text-sm text-slate-400">正在連線至雲端資料庫，或目前尚無建立任何分類。</p>
                    </div>
                    {user && (
                      <button 
                        onClick={seedDatabase}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-full text-xs font-bold uppercase tracking-widest hover:bg-indigo-700 transition-colors"
                      >
                        點此初始化範例資料
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {filteredMenu.map((group, gIdx) => (
                      <motion.div 
                        key={group.id}
                        layout
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: gIdx * 0.05 }}
                        className={`group relative bg-white border border-slate-200 rounded-[2rem] flex flex-col ${expandedGroups[group.id] ? 'h-full' : 'self-start'} ${isEditMode ? 'p-6 md:p-8' : 'p-4'} hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-500 cursor-pointer ${expandedGroups[group.id] ? (isEditMode ? 'col-span-full md:col-span-2 lg:col-span-2 ring-2 ring-indigo-600 shadow-xl overflow-visible' : 'ring-2 ring-indigo-600 shadow-xl') : 'hover:-translate-y-2 overflow-hidden'}`}
                        onClick={() => toggleGroup(group.id)}
                      >
                        {/* Decorative Background for card */}
                        <div className={`absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 rounded-full blur-3xl transition-colors duration-500 ${expandedGroups[group.id] ? 'bg-indigo-500/10' : 'bg-slate-100 group-hover:bg-indigo-500/5'}`}></div>
                        
                        <div className={`relative z-10 ${isEditMode ? 'space-y-4' : 'space-y-3'}`}>
                          <div className={`rounded-2xl flex items-center justify-center transition-all duration-500 ${isEditMode ? 'w-14 h-14' : 'w-11 h-11'} ${expandedGroups[group.id] ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200 rotate-6' : 'bg-slate-50 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-600 group-hover:rotate-6'}`}>
                            {isEditMode ? (
                              <IconPicker 
                                currentIcon={group.icon || (group.id === 'f1' ? 'Receipt' : group.id === 'f2' ? 'Briefcase' : group.id === 'f3' ? 'Monitor' : 'Heart')} 
                                onChange={(icon) => updateGroupProp(group.id, 'icon', icon)}
                                size={28}
                              />
                            ) : (
                              <div className="flex items-center justify-center">
                                {React.cloneElement(iconMap[group.icon || (group.id === 'f1' ? 'Receipt' : group.id === 'f2' ? 'Briefcase' : group.id === 'f3' ? 'Monitor' : 'Heart')] || <List size={26}/>, { size: isEditMode ? 28 : 22 })}
                              </div>
                            )}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between">
                              {isEditMode ? (
                                <DebouncedInput 
                                  className="w-full bg-transparent border-b border-indigo-200 focus:border-indigo-600 outline-none font-black text-slate-800"
                                  style={{ fontSize: `${groupFontSize}px` }}
                                  value={group.group}
                                  onClick={(e) => e.stopPropagation()}
                                  onChange={(val) => updateGroupTitle(group.id, val)}
                                />
                              ) : (
                                <h3 className="font-black text-slate-800 group-hover:text-indigo-600 transition-colors leading-tight" style={{ fontSize: `${groupFontSize}px` }}>
                                  {highlightText(group.group, searchTerm)}
                                </h3>
                              )}
                            </div>
                            {isEditMode ? (
                              <DebouncedInput 
                                className="w-full bg-transparent border-b border-indigo-100 focus:border-indigo-600 outline-none text-xs text-slate-500 leading-relaxed font-medium"
                                value={group.description || ''}
                                onClick={(e) => e.stopPropagation()}
                                onChange={(val) => updateGroupProp(group.id, 'description', val)}
                                placeholder="輸入分類描述..."
                              />
                            ) : (
                              <p className="text-xs text-slate-500 leading-relaxed font-medium">
                                {group.description || '點擊展開查看所有子分類與行政細節。'}
                              </p>
                            )}
                          </div>
                        </div>
                        
                        <div className="absolute top-4 right-4 flex items-center gap-2 z-[30]">
                          {isEditMode && (
                            <div className="flex items-center bg-white/90 border border-indigo-200 rounded-xl p-1 shadow-lg backdrop-blur-md">
                              <button onClick={(e) => moveGroup(group.id, 'left', e)} className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all" title="向左移"><ArrowLeft size={16}/></button>
                              <button onClick={(e) => moveGroup(group.id, 'right', e)} className="p-2 text-indigo-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-all" title="向右移"><ArrowRight size={16}/></button>
                              <div className="w-px h-4 bg-indigo-100 mx-1"></div>
                              <button onClick={(e) => deleteGroup(group.id, e)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="刪除分類">
                                <Trash2 size={16}/>
                              </button>
                            </div>
                          )}
                          <div className={`p-2 rounded-full transition-all duration-300 ${expandedGroups[group.id] ? 'bg-indigo-50 text-indigo-600 rotate-180' : 'bg-slate-50 text-slate-300 group-hover:bg-indigo-50 group-hover:text-indigo-600'}`}>
                            <ChevronDown size={14}/>
                          </div>
                        </div>

                        {/* Sub-items List Expanded */}
                        <AnimatePresence>
                          {expandedGroups[group.id] && (
                            <motion.div 
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              className="mt-3 space-y-2 border-t border-slate-100 pt-4"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {group.items.map((item, iIdx) => (
                                <div key={item.id} className="group/item flex items-center gap-2">
                                  <div
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setActiveId(item.id)}
                                    className={`flex-grow cursor-pointer text-left ${isEditMode ? 'p-4' : 'p-2.5'} rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-100 flex items-center justify-between transition-all`}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        setActiveId(item.id);
                                      }
                                    }}
                                  >
                                  <div className="flex-grow flex items-center gap-4 overflow-hidden">
                                    <div className="shrink-0 w-2 h-2 rounded-full bg-slate-200 group-hover/item:bg-indigo-500 transition-colors"></div>
                                      {isEditMode ? (
                                        <div className="w-full flex items-center gap-2">
                                          <DebouncedInput 
                                            className="w-full bg-transparent border-b border-indigo-100 focus:border-indigo-500 outline-none text-slate-600 font-bold min-w-0 px-1"
                                            style={{ fontSize: `${itemFontSize}px` }}
                                            value={item.title}
                                            onClick={(e) => e.stopPropagation()}
                                            onChange={(val) => updateItemTitle(group.id, item.id, val)}
                                          />
                                          <button 
                                            onClick={(e) => toggleItemBadge(group.id, item.id, e)}
                                            className={`shrink-0 text-[8px] font-black px-1.5 py-0.5 rounded-sm tracking-tighter transition-all ${item.showBadge ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-300 hover:text-slate-500'}`}
                                            title="手動切換 NEW 標籤"
                                          >
                                            NEW
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center gap-2 overflow-hidden">
                                          <span className="truncate font-bold text-slate-600 group-hover/item:text-slate-900 transition-colors" style={{ fontSize: `${itemFontSize}px` }}>
                                             {highlightText(item.title, searchTerm)}
                                             {item.content?.some(s => s.items?.some(it => it.type === 'image' && it.value)) && (
                                               <ImageIcon size={10} className="inline ml-1.5 text-indigo-400 opacity-60" />
                                             )}
                                          </span>
                                          {item.showBadge && (
                                            <motion.span 
                                              initial={{ opacity: 0, x: -5 }} animate={{ opacity: 1, x: 0 }}
                                              className="shrink-0 text-[8px] font-black bg-indigo-600 text-white px-1.5 py-0.5 rounded-sm tracking-tighter"
                                            >
                                              NEW
                                            </motion.span>
                                          )}
                                        </div>
                                      )}
                                  </div>
                                  {!isEditMode && (
                                     <div className="shrink-0 opacity-0 group-hover/item:opacity-100 translate-x-2 group-hover/item:translate-x-0 transition-all">
                                        <ArrowRight size={14} className="text-indigo-500"/>
                                     </div>
                                  )}
                                  </div>
                                  {isEditMode && (
                                  <div className="shrink-0 flex items-center bg-indigo-50 rounded-xl p-1 border border-indigo-100 shadow-sm z-20">
                                    <button onClick={(e) => moveItem(group.id, item.id, 'up', e)} className="p-2 text-indigo-400 hover:text-indigo-700 hover:bg-white rounded-lg transition-all" title="上移">
                                      <ArrowUp size={14}/>
                                    </button>
                                    <button onClick={(e) => moveItem(group.id, item.id, 'down', e)} className="p-2 text-indigo-400 hover:text-indigo-700 hover:bg-white rounded-lg transition-all" title="下移">
                                      <ArrowDown size={14}/>
                                    </button>
                                    <div className="w-px h-4 bg-indigo-100 mx-1"></div>
                                    <button onClick={(e) => deleteItem(group.id, item.id, e)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="刪除項目">
                                      <Trash2 size={14}/>
                                    </button>
                                  </div>
                                )}
                                </div>
                              ))}
                              {isEditMode && (
                                <div className="mt-4 flex gap-2">
                                  <button onClick={(e) => addItem(group.id, e)} className="flex-grow border border-dashed border-slate-200 p-4 rounded-2xl flex items-center justify-center gap-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200 transition-all">
                                    <PlusCircle size={18}/> <span className="text-xs font-black uppercase tracking-widest">新增項目</span>
                                  </button>
                                  <button 
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setAiTargetGroupId(group.id);
                                      setIsAiModalOpen(true);
                                    }}
                                    className="px-6 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2 text-xs font-black uppercase tracking-widest"
                                  >
                                    <Sparkles size={16}/> <span>AI 快速整理</span>
                                  </button>
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

                {/* Categories Grid - Refined Layout removed duplicates check */}
              </motion.div>
            ) : (
              /* Detail View - Preservation of logic with Indigo/Slate theme */
              <motion.div 
                id="resource-detail-view"
                key="detail"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-10"
              >
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-200 pb-12">
                  <div className="space-y-6 flex-grow">
                    <button onClick={() => setActiveId(null)} className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 shadow-sm text-slate-600 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50 rounded-xl text-[10px] font-bold tracking-widest uppercase transition-all">
                      <ArrowLeft size={16}/> 返回主頁
                    </button>
                    <div className="flex items-center gap-8">
                      <div className="w-20 h-20 bg-slate-900 text-white rounded-3xl flex items-center justify-center shadow-2xl ring-4 ring-indigo-500/20">
                        {isEditMode ? (
                          <IconPicker 
                            currentIcon={activeItemData.icon || 'Layers'} 
                            onChange={(icon) => updateItemProp(activeId, 'icon', icon)}
                            size={40}
                          />
                        ) : (
                          React.cloneElement(iconMap[activeItemData.icon] || <Layers size={32}/>, { size: 32 })
                        )}
                      </div>
                      <div className="space-y-1">
                        {isEditMode ? (
                          <div className="space-y-2">
                             <div className="flex items-center gap-2">
                               <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">移動至分類:</span>
                               <select 
                                 className="bg-indigo-50 border-none text-[10px] font-bold text-indigo-700 px-2 py-1 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500/20"
                                 value={dbData[activeItemData.gIdx].id}
                                 onChange={(e) => moveItemToGroup(activeId, e.target.value)}
                               >
                                 {dbData.map(g => (
                                   <option key={g.id} value={g.id}>{g.group}</option>
                                 ))}
                               </select>
                             </div>
                             <DebouncedInput 
                               className="font-bold text-slate-900 tracking-tight bg-transparent border-b-2 border-slate-200 focus:border-indigo-500 outline-none w-full pb-1"
                               style={{ fontSize: `${detailTitleFontSize}px` }}
                               value={activeItemData.title} 
                               onChange={(val) => updateItemProp(activeId, 'title', val)}
                             />
                             <DebouncedInput 
                               className="text-sm font-medium text-slate-500 bg-transparent border-b border-slate-100 focus:border-indigo-400 outline-none w-full py-1"
                               value={activeItemData.description || ''} 
                               onChange={(val) => updateItemProp(activeId, 'description', val)}
                               placeholder="輸入項目簡短描述或子標題..."
                             />
                          </div>
                        ) : (
                          <>
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest block">{dbData[activeItemData.gIdx].group}</span>
                            <h2 className="font-bold text-slate-900 tracking-tight" style={{ fontSize: `${detailTitleFontSize}px` }}>{highlightText(activeItemData.title, searchTerm)}</h2>
                            {activeItemData.description && (
                              <p className="text-slate-500 font-medium mt-2 leading-relaxed">{highlightText(activeItemData.description, searchTerm)}</p>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 max-w-6xl pb-40">
                  <div className="md:col-span-12 space-y-8">
                    {activeItemData.content.map((sec, sIdx) => (
                      <div key={sec.id} className={`bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm ${isEditMode ? 'ring-2 ring-indigo-500' : ''} transition-all`}>
                        <div className={`px-8 py-5 border-b border-slate-100 flex items-center justify-between ${sec.type === 'important' ? 'bg-amber-50' : 'bg-slate-50'}`}>
                          {isEditMode ? (
                            <DebouncedInput 
                              className="bg-transparent border-b border-indigo-200 focus:border-indigo-600 outline-none font-bold uppercase tracking-widest text-slate-800 w-full max-w-lg"
                              style={{ fontSize: `${sectionFontSize}px` }}
                              value={sec.title}
                              onChange={(val) => {
                                const currentSIdx = activeItemData.content.findIndex(s => s.id === sec.id);
                                updateSectionTitle(activeItemData.gIdx, activeItemData.iIdx, currentSIdx, val);
                              }}
                            />
                          ) : (
                            <h3 className="font-bold uppercase tracking-widest text-slate-800" style={{ fontSize: `${sectionFontSize}px` }}>{highlightText(sec.title, searchTerm)}</h3>
                          )}
                          
                          {isEditMode && (
                            <div className="flex items-center gap-2">
                              <button onClick={() => moveSection(activeItemData.gIdx, activeItemData.iIdx, sIdx, 'up')} className="p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-indigo-600 transition-colors"><ArrowUp size={16}/></button>
                              <button onClick={() => moveSection(activeItemData.gIdx, activeItemData.iIdx, sIdx, 'down')} className="p-2 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-indigo-600 transition-colors"><ArrowDown size={16}/></button>
                              <button onClick={() => toggleSectionType(activeItemData.gIdx, activeItemData.iIdx, sIdx)} title="切換區塊類型 (清單/重要/數字)" className={`p-2 rounded-lg transition-colors flex items-center gap-1 ${sec.type === 'important' ? 'bg-indigo-100 text-indigo-700' : sec.type === 'steps' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-200 hover:text-indigo-600'}`}>
                                <AlertCircle size={16}/>
                                {isEditMode && <span className="text-[9px] font-bold uppercase">{sec.type === 'steps' ? '1.2.3' : sec.type === 'important' ? '!' : 'List'}</span>}
                              </button>
                              <button onClick={() => deleteSection(activeItemData.gIdx, activeItemData.iIdx, sIdx)} className="p-2 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={16}/></button>
                            </div>
                          )}
                        </div>
                        <div className="p-8 lg:p-10 space-y-6">
                            {sec.items.map((it, i) => (
                              <div key={it.id || i} className="group/block flex items-start gap-5 relative">
                                <div className="mt-1.5 flex-shrink-0 flex flex-col items-center gap-1">
                                  {sec.type === 'steps' ? ( 
                                    <div className="w-6 h-6 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-[11px]">{i+1}</div> 
                                  ) : ( 
                                    <div className={`p-1.5 rounded-lg ${sec.type === 'important' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'}`}> 
                                      <AlertCircle size={14}/> 
                                    </div> 
                                  )}
                                  {isEditMode && (
                                    <div className="flex flex-col gap-1 ml-2 opacity-60 group-hover/block:opacity-100 transition-opacity">
                                      <button onClick={() => {
                                        const sIdx = activeItemData.content.findIndex(s => s.id === sec.id);
                                        moveBlock(activeItemData.gIdx, activeItemData.iIdx, sIdx, i, 'up');
                                      }} className="p-1.5 rounded bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors" title="上移項目"><ArrowUp size={12}/></button>
                                      <button onClick={() => {
                                        const sIdx = activeItemData.content.findIndex(s => s.id === sec.id);
                                        moveBlock(activeItemData.gIdx, activeItemData.iIdx, sIdx, i, 'down');
                                      }} className="p-1.5 rounded bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors" title="下移項目"><ArrowDown size={12}/></button>
                                      <button onClick={() => {
                                        const sIdx = activeItemData.content.findIndex(s => s.id === sec.id);
                                        deleteBlock(activeItemData.gIdx, activeItemData.iIdx, sIdx, i);
                                      }} className="p-1.5 rounded bg-slate-100 text-slate-300 hover:text-red-500 transition-colors" title="刪除項目"><Trash2 size={12}/></button>
                                    </div>
                                  )}
                                </div>
                                <div className="flex-grow">
                                  {it.type === 'text' ? (
                                    isEditMode ? ( 
                                      <div className="space-y-2">
                                        <DebouncedTextarea className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" style={{ fontSize: `${contentFontSize}px` }} value={it.value} onChange={(val) => {
                                          updateBlockValue(sec.id, i, val);
                                        }} /> 
                                        <button onClick={() => {
                                          const currentSIdx = activeItemData.content.findIndex(s => s.id === sec.id);
                                          toggleBold(activeItemData.gIdx, activeItemData.iIdx, currentSIdx, i);
                                        }} className={`text-[10px] uppercase tracking-widest font-bold px-3 py-1 rounded-md transition-colors ${it.isBold ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}>B</button>
                                      </div>
                                    ) : ( <p className={`leading-relaxed whitespace-pre-wrap ${it.isBold ? 'font-bold text-slate-900' : 'text-slate-600'}`} style={{ fontSize: `${contentFontSize}px` }}>{highlightText(it.value, searchTerm)}</p> )
                                  ) : (
                                    <div 
                                      tabIndex={isEditMode ? 0 : -1}
                                      className={`rounded-2xl overflow-hidden border border-slate-200 relative group/img min-h-[100px] transition-all outline-none ${!isEditMode && it.value ? 'cursor-zoom-in' : ''} ${isEditMode ? 'focus-within:ring-2 focus-within:ring-indigo-500 ring-offset-2' : ''}`} 
                                      style={{ width: it.width ? `${it.width}%` : '100%' }}
                                      onPaste={(e) => {
                                        if (isEditMode) {
                                          handleImagePaste(sec.id, i, e);
                                        }
                                      }}
                                    >
                                      {it.value ? (
                                        <img 
                                          referrerPolicy="no-referrer"
                                          src={it.value} 
                                          className="max-w-full mx-auto" 
                                          alt="" 
                                          onClick={() => !isEditMode && setFullscreenImage(it.value)}
                                        />
                                      ) : (
                                         <div className="aspect-video bg-slate-50 flex flex-col items-center justify-center text-slate-300 gap-2">
                                           <ImageIcon size={48} strokeWidth={1} />
                                           <span className="text-[10px] font-bold uppercase tracking-widest">目前無圖片內容</span>
                                         </div>
                                      )}
                                      {isEditMode && (
                                        <div className={`absolute inset-0 bg-slate-900/60 flex flex-col items-center justify-center gap-4 transition-opacity p-6 z-10 ${it.value ? 'opacity-0 group-hover/img:opacity-100 focus-within:opacity-100' : 'opacity-100'}`}>
                                           <div className="flex flex-col items-center gap-3 w-full max-w-xs">
                                              <label className="w-full bg-white text-indigo-600 hover:bg-indigo-50 px-4 py-2.5 rounded-xl text-xs font-black text-center cursor-pointer shadow-2xl transition-all flex items-center justify-center gap-2 hover:scale-105 active:scale-95 uppercase tracking-widest">
                                                <Upload size={14}/> 選擇檔案上傳
                                                <input type="file" className="hidden" accept="image/*" onChange={(e) => {
                                                  handleImageUpload(sec.id, i, e);
                                                }} />
                                              </label>
                                              
                                              <div className="w-full bg-white/10 rounded-xl p-3 border border-white/10 space-y-2">
                                                <div className="flex justify-between items-center text-[10px] font-black text-white uppercase tracking-widest">
                                                  <span>圖片寬度</span>
                                                  <span>{it.width || 100}%</span>
                                                </div>
                                                <input 
                                                  type="range" min="20" max="100" 
                                                  value={it.width || 100} 
                                                  onChange={(e) => {
                                                    const currentSIdx = activeItemData.content.findIndex(s => s.id === sec.id);
                                                  updateBlockProp(sec.id, i, 'width', parseInt(e.target.value));
                                                  }}
                                                  className="w-full accent-white h-1 bg-white/20 rounded-full appearance-none cursor-pointer" 
                                                />
                                              </div>

                                              <div className="flex items-center gap-2 w-full">
                                                <div className="h-px bg-white/20 grow"></div>
                                                <span className="text-[10px] text-white/40 font-bold uppercase italic">or</span>
                                                <div className="h-px bg-white/20 grow"></div>
                                              </div>
                                              <DebouncedInput 
                                                type="text" 
                                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-white/40 shadow-xl outline-none focus:bg-white focus:text-slate-900 transition-all font-bold" 
                                                placeholder="貼上網址... (或直接 Ctrl+V)" 
                                                value={it.value} 
                                                onChange={(val) => {
                                                  updateBlockValue(sec.id, i, val);
                                                }} 
                                                onPaste={(e) => {
                                                  handleImagePaste(sec.id, i, e);
                                                }} 
                                              />
                                           </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                            
                            {isEditMode && (
                              <div className="flex items-center gap-4 pt-4">
                                <button onClick={() => {
                                  const currentSIdx = activeItemData.content.findIndex(s => s.id === sec.id);
                                  addSmallBlock(activeItemData.gIdx, activeItemData.iIdx, currentSIdx, 'text');
                                }} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
                                  <Plus size={14}/> 新增文字
                                </button>
                                <button onClick={() => {
                                  const currentSIdx = activeItemData.content.findIndex(s => s.id === sec.id);
                                  addSmallBlock(activeItemData.gIdx, activeItemData.iIdx, currentSIdx, 'image');
                                }} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
                                  <ImageIcon size={14}/> 新增圖片
                                </button>
                                <button onClick={() => {
                                  const currentSIdx = activeItemData.content.findIndex(s => s.id === sec.id);
                                  addDetailLink(activeItemData.gIdx, activeItemData.iIdx, currentSIdx);
                                }} className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-indigo-600 transition-colors uppercase tracking-widest">
                                  <LinkIcon size={14}/> 新增連結
                                </button>
                              </div>
                            )}

                             {(sec.links && sec.links.length > 0 || isEditMode) && (
                              <div className="flex flex-wrap gap-4 pt-6">
                                {sec.links?.map((link, lIdx) => (
                                  <div key={link.label + lIdx} className="group/link flex flex-col gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl relative">
                                    {isEditMode ? (
                                      <div className="flex flex-col gap-2 pr-6">
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase">標籤:</span>
                                          <DebouncedInput 
                                            className="bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-indigo-600 outline-none w-32"
                                            value={link.label}
                                            onChange={(val) => {
                                              const currentSIdx = activeItemData.content.findIndex(s => s.id === sec.id);
                                              updateLinkVal(activeItemData.gIdx, activeItemData.iIdx, currentSIdx, lIdx, 'label', val);
                                            }}
                                          />
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] font-bold text-slate-400 uppercase">網址:</span>
                                          <DebouncedInput 
                                            className="bg-white border border-slate-200 rounded px-2 py-1 text-[10px] font-mono text-slate-500 outline-none w-48"
                                            value={link.url}
                                            onChange={(val) => {
                                              const currentSIdx = activeItemData.content.findIndex(s => s.id === sec.id);
                                              updateLinkVal(activeItemData.gIdx, activeItemData.iIdx, currentSIdx, lIdx, 'url', val);
                                            }}
                                          />
                                        </div>
                                        
                                        {/* Link Controls */}
                                        <div className="absolute right-1 top-1 flex flex-col gap-1">
                                          <button 
                                            onClick={() => {
                                              const currentSIdx = activeItemData.content.findIndex(s => s.id === sec.id);
                                              moveLink(activeItemData.gIdx, activeItemData.iIdx, currentSIdx, lIdx, 'up');
                                            }}
                                            className="p-1 rounded bg-white text-slate-400 hover:text-indigo-600 shadow-sm transition-colors"
                                          >
                                            <ArrowUp size={10}/>
                                          </button>
                                          <button 
                                            onClick={() => {
                                              const currentSIdx = activeItemData.content.findIndex(s => s.id === sec.id);
                                              moveLink(activeItemData.gIdx, activeItemData.iIdx, currentSIdx, lIdx, 'down');
                                            }}
                                            className="p-1 rounded bg-white text-slate-400 hover:text-indigo-600 shadow-sm transition-colors"
                                          >
                                            <ArrowDown size={10}/>
                                          </button>
                                          <button 
                                            onClick={async () => {
                                              const sIdx = activeItemData.content.findIndex(s => s.id === sec.id);
                                              const section = dbData[activeItemData.gIdx].items[activeItemData.iIdx].content[sIdx];
                                              const newLinks = [...section.links];
                                              newLinks.splice(lIdx, 1);
                                              await updateDoc(doc(db, 'sections', section.id), { links: newLinks });
                                              await touchItem(activeItemData.gIdx, activeItemData.iIdx);
                                            }}
                                            className="p-1 rounded bg-white text-red-400 hover:text-red-600 shadow-sm transition-colors"
                                          >
                                            <Trash2 size={10}/>
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <a href={link.url} target="_blank" rel="noreferrer" className="inline-flex items-center px-5 py-2.5 bg-white text-indigo-600 border border-slate-200 rounded-xl font-bold text-xs uppercase tracking-tight hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                                        <LinkIcon size={14} className="mr-2"/> {highlightText(link.label, searchTerm)}
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                        </div>
                      </div>
                    ))}

                    {isEditMode && (
                      <div className="flex justify-center gap-6 py-10 border-t border-slate-200">
                         <button onClick={() => addBigSection(activeItemData.gIdx, activeItemData.iIdx, 'list')} className="px-8 py-4 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-indigo-600 hover:border-indigo-600 hover:bg-indigo-50 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-3">
                           <PlusCircle size={20}/> 新增大區塊
                         </button>
                         <button onClick={() => addBigSection(activeItemData.gIdx, activeItemData.iIdx, 'important')} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl shadow-indigo-100">
                           <AlertCircle size={20}/> 新增重要提示區塊
                         </button>
                      </div>
                    )}

                    {!isEditMode && (
                      <div className="pt-10 border-t border-slate-100 flex flex-col gap-4">
                        <p className="text-xs font-medium text-slate-500 text-left leading-relaxed">
                          本資料僅供查詢輔助；如遇特殊情況或異動，請依最新規範或洽各行政單位聯絡。
                        </p>
                        {activeItemData.updatedAt && (
                          <div className="flex justify-end">
                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                              Edit by {(() => {
                                const date = new Date(activeItemData.updatedAt);
                                return `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
                              })()}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Standard Footer - Ultra Compact (Editable in Edit Mode) */}
      <footer className="bg-white border-t border-slate-200 py-3 mt-auto">
        <div className="max-w-[1200px] mx-auto px-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-2">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 leading-none">
                {isEditMode ? (
                  <div className="flex items-center gap-2">
                    <DebouncedInput 
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none outline-none focus:ring-1 focus:ring-indigo-500/20 w-16"
                      value={footerTaxLabel}
                      onChange={(val) => setFooterTaxLabel(val)}
                    />
                    <DebouncedInput 
                      className="bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-sm font-black text-slate-800 leading-none tracking-tight outline-none focus:ring-1 focus:ring-indigo-500/20 w-24"
                      value={footerTaxId}
                      onChange={(val) => setFooterTaxId(val)}
                    />
                  </div>
                ) : (
                  <>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{footerTaxLabel}</span>
                    <span className="text-sm font-black text-slate-800 leading-none tracking-tight">{footerTaxId}</span>
                  </>
                )}
              </div>
              <div className="w-px h-6 bg-slate-200"></div>
              {isEditMode ? (
                <DebouncedInput 
                  className="bg-slate-50 border border-slate-200 rounded px-3 py-0.5 text-[11px] font-black text-indigo-600/50 uppercase tracking-[0.2em] outline-none focus:ring-1 focus:ring-indigo-500/20 w-48 text-center"
                  value={footerCopyright}
                  onChange={(val) => setFooterCopyright(val)}
                />
              ) : (
                <p className="text-[11px] font-black text-indigo-600/50 uppercase tracking-[0.2em]">{footerCopyright}</p>
              )}
            </div>
            
            <div className="hidden md:block w-px h-4 bg-slate-100"></div>

            {isEditMode ? (
               <DebouncedInput 
                  className="bg-slate-50 border border-slate-200 rounded px-3 py-0.5 text-[10px] font-black text-indigo-600 outline-none focus:ring-1 focus:ring-indigo-500/20 w-28 text-center uppercase tracking-widest"
                  value={footerScrollText}
                  onChange={(val) => setFooterScrollText(val)}
                />
            ) : (
              <button 
                onClick={() => window.scrollTo({top:0, behavior:'smooth'})} 
                className="group flex items-center gap-2 text-[10px] font-black text-indigo-600 hover:text-indigo-800 transition-all uppercase tracking-widest"
              >
                {footerScrollText}
                <ArrowUp size={12} className="group-hover:-translate-y-1 transition-transform duration-300"/>
              </button>
            )}
        </div>
      </footer>

      <AnimatePresence>
        {isAiModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={() => !isOrganizing && setIsAiModalOpen(false)}
            />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[32px] shadow-2xl overflow-hidden z-10 p-8 lg:p-10"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                      <Brain size={24} />
                   </div>
                   <div>
                      <h2 className="text-xl font-black text-slate-900 leading-tight">AI 內容結構化整理</h2>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">智能分析您的文字並自動排版</p>
                   </div>
                </div>
                <button 
                  onClick={() => setIsAiModalOpen(false)}
                  disabled={isOrganizing}
                  className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 transition-all rounded-full"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">選擇匯入的目標分類：</label>
                  <select 
                    value={aiTargetGroupId || ''} 
                    onChange={(e) => setAiTargetGroupId(e.target.value)}
                    disabled={isOrganizing}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-600 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all appearance-none cursor-pointer"
                  >
                    <option value="" disabled>-- 請選擇一個目標分類 --</option>
                    {dbData.map(group => (
                      <option key={group.id} value={group.id}>{group.group}</option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">子項目標題（若留空則由 AI 自動生成）：</label>
                  <input 
                    type="text"
                    value={aiNewItemTitle}
                    onChange={(e) => setAiNewItemTitle(e.target.value)}
                    placeholder="請輸入新項目的標題..."
                    disabled={isOrganizing}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-xs font-bold text-slate-600 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all"
                  />
                </div>

                <div className="relative">
                  <div className="absolute top-4 left-4 text-slate-300 pointer-events-none">
                     <Edit3 size={16} />
                  </div>
                  <DebouncedTextarea 
                    className="w-full h-80 bg-slate-50 border border-slate-100 rounded-3xl p-6 pl-12 text-sm text-slate-600 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all resize-none custom-scrollbar font-medium"
                    placeholder="在此貼上您的 Word 內容或零散的文字筆記... AI 將自動為您建立完整的子項目內容。"
                    value={aiInputText}
                    onChange={(val) => setAiInputText(val)}
                    disabled={isOrganizing}
                  />
                </div>

                <div className="flex items-center justify-between bg-indigo-50/50 p-6 rounded-3xl border border-indigo-100/50">
                  <div className="flex items-center gap-3">
                     <Sparkles className="text-indigo-600" size={18} />
                     <p className="text-[11px] font-bold text-indigo-900/60 leading-relaxed max-w-[280px]">
                        AI 會自動辨識標題、清單、注意事項與流程步驟，並轉換為本系統支援的視覺化區塊。
                     </p>
                  </div>
                  <button 
                    onClick={organizeWithAI}
                    disabled={isOrganizing || !aiInputText.trim()}
                    className={`px-10 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-3 shadow-xl ${
                      isOrganizing || !aiInputText.trim() 
                      ? 'bg-slate-100 text-slate-300 shadow-none cursor-not-allowed' 
                      : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 shadow-indigo-100'
                    }`}
                  >
                    {isOrganizing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        整理中...
                      </>
                    ) : (
                      <>
                        <Wand2 size={16} />
                        開始 AI 整理
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Image Lightbox Overlay */}
      <AnimatePresence>
        {fullscreenImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-900/98 backdrop-blur-xl flex items-center justify-center p-4 sm:p-10 cursor-zoom-out overflow-hidden"
            onClick={() => setFullscreenImage(null)}
          >
            <div className="relative w-full h-full flex items-center justify-center overflow-hidden rounded-3xl">
               <motion.div
                 initial={{ scale: 0.9, opacity: 0 }}
                 animate={{ scale: 1, opacity: 1 }}
                 exit={{ scale: 0.9, opacity: 0 }}
                 className="relative group/zoom flex items-center justify-center cursor-crosshair w-full h-full"
                 onMouseMove={(e) => {
                   const { left, top, width, height } = e.currentTarget.getBoundingClientRect();
                   const x = ((e.clientX - left) / width) * 100;
                   const y = ((e.clientY - top) / height) * 100;
                   const img = e.currentTarget.querySelector('img');
                   if (img) img.style.transformOrigin = `${x}% ${y}%`;
                 }}
                 onClick={(e) => e.stopPropagation()}
               >
                 <img 
                    referrerPolicy="no-referrer"
                   src={fullscreenImage} 
                    className="max-w-full max-h-full rounded-2xl shadow-2xl object-contain transition-transform duration-200 ease-out hover:scale-[1.5]"
                    alt="Expanded view"
                  />
               </motion.div>
            </div>

            <button 
              className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-xl transition-all border border-white/10 z-[110]"
              onClick={() => setFullscreenImage(null)}
            >
              <Plus size={24} className="rotate-45" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(71, 85, 105, 0.1); border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(71, 85, 105, 0.2); }
        .line-clamp-2 { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
      `}</style>
    </div>
  );
};

export default App;
