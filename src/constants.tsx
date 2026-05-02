import { 
  Plane, Laptop, Music, Utensils, FileText, 
  Receipt, Building, UserCheck, Phone, 
  ShoppingCart, Users, Globe, Printer, Coffee, 
  MousePointer, Key, Heart, LogOut, Calculator, Home,
  Edit3, Plus, Trash2, ArrowLeft, ImageIcon, Upload,
  ArrowUp, ArrowDown, Type, Link as LinkIcon, Save,
  HelpCircle, Briefcase, FileSpreadsheet, UserPlus,
  History, Stamp, Archive, ShieldAlert, Coins, Scale,
  Settings, Monitor, BookOpen, HardDrive, UserCog, Wifi, Mouse,
  Car, Cpu, UserCircle, Gift, UserMinus, Calendar, Bell, Mail, Map,
  PlusCircle, ImagePlus, Link2, Lock, Bold,
  Layers, List, Clock, AlertCircle
} from 'lucide-react';

export const INITIAL_DB = [
  {
    group: '財務核銷與外包 (檔案 1)',
    id: 'f1',
    description: '出差申請、外包規範、軟體請款、門部聚餐與勞務報酬',
    items: [
      {
        id: 'travel_f1', title: '出差申請與差旅報告', icon: 'Plane',
        content: [
          { title: '出差申請作業 (前置)', type: 'steps', items: [{type:'text', value:'出差帶團人需聯絡 總機佩儀#1200 訂機票飯店(提供資訊出差人員名單及出差時間、來回航班時間需求，住宿飯店（幾個房間等）)，她會與旅行社聯絡訂機票及住宿安排，出差前會派發機票資訊給出差領隊或單位窗口。'},{type:'text', value:'出差前，請填寫內網_出差申請單；若屬「多人共同出差」之行程，可由其中一位同仁作為主要申請人（代辦人），統一於內網系統提交出差申請。（不須另外填寫請假單,系統會產公假）。'},{type:'text', value:'出差申請單目前在舊內網 http://igsweb/flow/FM_MyPage.aspx，此連結請用 Edge 瀏覽器開啟，並從左側選單進入左側點選 [出差申請單]。'},{type:'text', value:'機票及住宿由管理部 總機 佩儀統一處理。若是國外出差請確認護照是否在有效期內，若是過期或是沒有請盡早告知佩儀協助辦理，卡式台胞証也是。'}], links:[{label:'申請護照準備文件下載', url:'https://internationalgamessystem.sharepoint.com/:w:/t/ACD_RD2_Public/IQAbASE3fSezSIZ9wXsQnMMAAUJA83v8DGte5nW9gyxxLg4?e=cZ8RVK'}] },
          { title: '借支作業 (ERP aapt150)', type: 'important', items: [{type:'text', value:'同仁若有借支需求，可向出差帶團人告知，帶團人需請TIPTOP權限人員協助處理申請作業(借支額度請同仁依照公司規範)詳內網文管中心ADW-024出差管理辦法。'},{type:'text', value:'進ERP系統(aapt150)KEY單：帳款日為領取借支日(可以設出差日前兩天)-廠商Z4999-類別1281暫付款-幣別依狀況-付款條件AP200-品名:部門.姓名.出差期間.地點出差借支。'},{type:'text', value:'作業流程&時間：列印請款單TIPTOP+簽核(看金額簽)完成後送單至財會部曉君，最晚在出差日期的前三個工作天完成送單至財會(可洽財會邱曉君#1213確認)。'},{type:'text', value:'同仁如有私人消費需要多兌換外幣，可在出發前提早向財會部邱曉君#1213、劉曉萍#1216諮詢協助。'}] },
          { title: '出差返回與津貼注意', type: 'list', items: [{type:'text', value:'1. 收集單據：出差帶團人和統整人員一起匯整機票、交通費及收據，並統計退支金額。填寫差旅報告單(ADW-024-01)。'},{type:'text', value:'2. 簽核流程：差旅報告單簽核路徑為：出差人們 -> 出差人主管 -> 陳總。完成後將退支明細、報告單及收據交給財會游宜珊。退支現金交給邱曉君。'},{type:'text', value:'3. 津貼確認：財會宜珊計算完津貼後，需由出差人及主管再次簽核，交回財會才算結束。'},{type:'text', value:'4. 報帳規則：發票統編23519738；國外刷卡食宿需附帳單(看匯率)；伴手禮以食品為主(洽宜珊#1303)；退支金額不可超過借支金額。'},{type:'text', value:'5. 入帳時間：應付出差日支(匯款)於10日或25日；應扣出差日支(扣款)於下個月5日薪資日。'},{type:'text', value:'6. 建議出發要從公司出發(TAXI才能報)。'}], links:[{label:'差旅報告書參考範例', url:'https://internationalgamessystem.sharepoint.com/:w:/t/ACD_RD2_Public/IQBDqfmTPDstTbG4YdpTgPgsAWfdHsqL0TdVDwZkNsMz3XI?e=mqbkRB'}] }
        ]
      },
      {
        id: 'outsource_sw_f1', title: '軟體外包規範', icon: 'Laptop',
        content: [
          { title: '必需文件與付款條件', type: 'list', items: [{type:'text', value:'必需文件: 委外提案申請表、保密合約(一式兩份)、主合約(含報價單)、用印申請單、專案請購單、委外驗收審核單、TIPTOP請付款單、INVOICE收據、勞務報酬單(個人)。'},{type:'text', value:'付款時間: 依合約規定，常見為驗收日次月25日或驗收後30個工作天。匯款日通常為10號或25號。'},{type:'text', value:'重要提示: Invoice月份需與驗收單月份一致。涉所得代扣稅額(國外、授權金)需附請購藍單供核對。'}] },
          { title: '簽核權限門檻 (陳總簽核級別)', type: 'important', items: [{type:'text', value:'專案請購單 (藍單)：換算台幣 5 萬以上需簽至陳總。'},{type:'text', value:'用印、驗收、勞務單、TIPTOP單：換算台幣 10 萬以上需簽至陳總。'},{type:'text', value:'金額異動：若實付金額比請購單小，可直接修改蓋章，不須重簽。'}] },
          { title: '各表單簽核欄位詳解', type: 'steps', items: [{type:'text', value:'委外提案申請表 (RDP-014)：申請人 -> 提案單位主管 (專案負責人) -> 權責主管 (部級) -> 處級主管 (陳總)。'},{type:'text', value:'委外驗收審核單 (RDP-014-03)：驗收人員 -> 專案負責人 -> 權責主管 (部級、陳總)。'},{type:'text', value:'用印申請單：承辦人 -> 部主管 -> 處級以上 (依金額) -> 法務 (伯峰#1214)。金額涉及代扣稅需註明含稅/未稅。'},{type:'text', value:'勞務報酬單：主辦人 (驗收人) -> 主辦主管 (專案部主管、陳總)。'}] },
          { title: '作業備註與歸檔', type: 'list', items: [{type:'text', value:'國外廠商：注意稅額，所有文件及 TIPTOP 寫「含稅金額」。合約用印完需掃描 PDF 上傳 TIPTOP。'},{type:'text', value:'結案歸檔正本：最後研發應留底「委外提案申請單」、「驗收單」、「專案請購藍單」正本。'}], links:[{label:'寄件通知單(大陸快遞)', url:'https://internationalgamessystem.sharepoint.com/:w:/t/ACD_RD2_Public/IQABvUGfJzJBSJCZZ8cyZCypAREvlSsEAdFYH6qIGbgEz1E?e=5ORIEr'}] }
        ]
      },
      { id: 'music_f1', title: '音樂音效外包 (Fazu)', icon: 'Music', content: [{ title: 'Fazu Art 專案請款', type: 'details', items: [{type:'text', value:'2026.3月Case_吉貓開運音樂音效(美金)。所需文件：合約PDF、專案請購單、委外驗收單、TIPTOP單、INVOICE。'},{type:'text', value:'注意：Fazu 要求對帳，TIPTOP 務必 KEY 發票號碼。窗口 Talia。合約洽尤靖雯#3501。'}], links:[{label:'維護總表', url:'https://docs.google.com/spreadsheets/d/1HdUyOmk7FHoxr-ss_lU_tM8310aKSjLNWp7W0abOtGw/edit?gid=0#gid=0'}, {label:'Tiptop請款圖示', url:'https://internationalgamessystem.sharepoint.com/:i:/t/ACD_RD2_Public/IQBZq2nZ9ZldS7haH1ZkgpZ3AWF2TxYf1RiUZQGBGgsiOnY?e=5vg1x7'}] }] },
      { id: 'dinner_f1', title: '部門聚餐請款', icon: 'Utensils', content: [{ title: '額度與要求', type: 'important', items: [{type:'text', value:'上限：每位同仁上半年與下半年各 1,000 元 (含約聘/工讀/新進)。'},{type:'text', value:'必備文件：支出證明單 (大寫金額、事由註明人數) + TIPTOP 單 (aapt120) + 人數清單。'},{type:'text', value:'TIPTOP: 廠商選 MISC。類別「633201研-雜費」。品名「餐費」。統編 23519738。手寫收據上限 5,000 元。'},{type:'text', value:'報帳人數最多為當月內網部門人數。'}], links:[{label:'Tiptop圖示連結', url:'https://internationalgamessystem.sharepoint.com/:w:/t/ACD_RD2_Public/IQCS4c4FGcgzRquzzpAojmX2ARTA-AWC26tgRMuexiAz9cE?e=ZvLdQN'}] }] },
      { id: 'blue_form_f1', title: '專案請購單 (藍單)', icon: 'FileText', content: [{ title: '作業規範', type: 'list', items: [{type:'text', value:'時機：費用需掛在專案案號時使用。需填案名、案號、摘要。'},{type:'text', value:'附註：基本上需附公司統編發票。走採購製造部流程者不須寫此單，以 TIPTOP 為主。'}] }] },
      { id: 'expense_form_f1', title: '支出證明單 (ADW-030)', icon: 'Receipt', content: [{ title: '作業規範', type: 'list', items: [{type:'text', value:'限制：不可超過 1 萬元 (聚餐除外)。常用於與廠商餐敘與交通費。'},{type:'text', value:'事由範例：META客戶餐敘與交通費、台科大顧問餐敘費。'}] }] },
      { id: 'vendor_f1', title: '廠商建檔與修改', icon: 'UserPlus', content: [{ title: '建檔流程', type: 'details', items: [{type:'text', value:'1. 下載基本資料表。2. 寄給王憶茹#1244。'},{type:'text', value:'3. 國內附存摺影本；國外需匯款細節(大陸廠商多提供CNAPS行號)。'}], links:[{label:'廠商資料表', url:'https://internationalgamessystem.sharepoint.com/:w:/t/ACD_RD2_Public/IQBit2X8xnhqQ7PqUKCsvweTAXl53c1_fzyvTeCAUzxenMw?e=hqq4bw'}, {label:'國外匯款細節表', url:'https://internationalgamessystem.sharepoint.com/:w:/t/ACD_RD2_Public/IQCd0GzmY-JjQ4go7o4HRuF4AaSiwgHSo0yrsybTsCc_H0c?e=Zl4V5n'}] }] },
      { id: 'labor_f1', title: '勞務報酬單作業', icon: 'Calculator', content: [{ title: '規範與計算', type: 'important', items: [{type:'text', value:'對象：台灣個人戶。ADW-006-03 最新版。'},{type:'text', value:'所得稅：10% (小數點無條件捨去)。'},{type:'text', value:'二代健保：2.11% (小數點四捨五入)。若附工會繳費影本則填0元。'},{type:'text', value:'公司行號和鄉鎮區公所，都要扣2.11%。'}] }, { title: '流水號申請 (重要)', type: 'steps', items: [{type:'text', value:'1. 進入舊內網 (Edge開啟) -> 財會部 -> 其他所得執行業務。'},{type:'text', value:'2. 填寫金額(計算需與勞務單一致)後送出。'},{type:'text', value:'3. 取得表單流水號，填入勞務報酬單右上角。'}] }, { title: '圖示參考', type: 'list', items: [{type:'text', value:'請領人資料務必勾選完整並簽名。'}], links:[{label:'勞務報酬單範本', url:'https://internationalgamessystem.sharepoint.com/:w:/t/ACD_RD2_Public/IQCXdc1HcGafRp35DRALSLPLAX3fMIwrp0X-9RTR9kpmDEc?e=qTII9r'}] }] },
      { id: 'finance_contact_f1', title: '財務諮詢分機', icon: 'Phone', content: [{ title: '核心窗口', type: 'list', items: [{type:'text', value:'台幣/TIPTOP單：謝孟容#1243'},{type:'text', value:'外幣/發票/出差/請購單：游宜珊#1303'},{type:'text', value:'合約代扣稅額計算：林素月#1217、游宜珊#1303'},{type:'text', value:'出差借支領現：邱曉君#1213'}] }] }
    ]
  },
  {
    group: '公文流程與專案協作 (檔案 2)',
    id: 'f2',
    description: '採購申請、合約用印、專案歸檔與行政窗口彙整',
    items: [
      { id: 'procure_f2', title: '公司採購申請', icon: 'ShoppingCart', content: [{ title: '流程與窗口', type: 'steps', items: [{type:'text', value:'Step 1.申請 cc 主管、Step 2.TIPTOP 開單 (apmt420)、Step 3.到貨 (估 2 週)。'},{type:'text', value:'分攤 cc 陳妤姍#2205。窗口：顧心寧#2021、簡穎如#2203、張穎之#2393。'},{type:'text', value:'信件內容需註明商品名稱、規格、數量、價格、官網連結、使用目的等相關資訊。'},{type:'text', value:'若有急件或進度詢問，請準備好請購單號聯繫採購窗口。'},{type:'text', value:'需跑完系統簽核才會進購買流程。'}] }] },
      { id: 'pm_f2', title: '專案負責人變更', icon: 'UserCog', content: [{ title: '作業', type: 'details', items: [{type:'text', value:'RDP-002-20，新舊負責人皆需簽名，主管簽新單位即可。交文管詩雯#1206。'},{type:'text', value:'專案負責人變更需填寫欲變更之專案名稱、專案編號、專案負責人姓名。'}] }] },
      { id: 'seal_f2', title: '用印申請單', icon: 'Stamp', content: [{ title: '流程', type: 'details', items: [{type:'text', value:'ADW-030-01。路徑: 承辦人->部主管->處級->法務伯峰(4F)。最後詩雯歸檔。'},{type:'text', value:'主要用途：凡合約或各類正式文件需加蓋公司印信時，須經此申請單落實正式核准與授權。'}] }] },
      { id: 'paraguay_f2', title: '台巴計劃 (實習生)', icon: 'Globe', content: [{ title: '繳交', type: 'important', items: [{type:'text', value:'每位實習生填 3 份檔案。由主管與學生填。交管理部侯宇芩#1227。'},{type:'text', value:'說明文件之截圖範例僅供填寫格式參考，請務必依據當年度實際狀況及所屬部門資訊填寫。'}] }] },
      { id: 'hours_f2', title: '工時填寫與權限', icon: 'Monitor', content: [{ title: '窗口', type: 'list', items: [{type:'text', value:'研一楊子瑩/研二王瑜芳/研四曾詩珊/研五林芳如/研七郭玥瑄/研八進步琬欣。'},{type:'text', value:'進公司內網-作業平台-專案人力工時填寫。'},{type:'text', value:'若找不到專案，可上內網填寫系統維護申請單開通權限。'}] }] },
      { id: 'system_f2', title: '公司內網入口', icon: 'Globe', content: [{ title: '入口資訊', type: 'list', items: [{type:'text', value:'主要使用內網網址為 http://uof/UOF/Homepage.aspx。'},{type:'text', value:'舊內網網址為 http://igsweb/flow/FM_MyPage.aspx，需使用edge瀏覽器開啟。'}] }] },
      { id: 'admin_qa_f2', title: '行政洽詢窗口', icon: 'HelpCircle', content: [{ title: '窗口', type: 'list', items: [{type:'text', value:'合約/固資/藍單：高詩雯#1206；公務車：陳怡君#1234；法務：林伯峰#1214；板子：巧宜#2505、怡君#2242。'},{type:'text', value:'學習平台、B1訓練教室：陳怡君#1234。'},{type:'text', value:'產學合作：陳佳永#1231。'},{type:'text', value:'法務合約問題、智權和專利問題：林伯峰#1214。'},{type:'text', value:'商用NAS機器、Redmind系統和Mantis系統權限開通問題：各部門窗口或RD5徐鴻文#2025。'},{type:'text', value:'護照申請和台胞証申請：總機簡佩儀#1200。'}] }] }
    ]
  },
  {
    group: '資訊網路與辦公環境 (檔案 3)',
    id: 'f3',
    description: '網路開通、事務機使用、固資管理與設施報修',
    items: [
      { id: 'it_setup_f3', title: '網路與 MAC 開通', icon: 'Wifi', content: [{ title: '申請', type: 'steps', items: [{type:'text', value:'ISP-003-01。交育豪(WIFI)或睿浩(MAC/PC)。新 MACmini 需裝監控。'},{type:'text', value:'文件填寫申請類別/申請設備/申請單位/申請項目/申請用途/參數設數。'},{type:'text', value:'MAC和PC不同網段，接在一起會不通。'}] }] },
      { id: 'printer_f3', title: '事務機 RICOH', icon: 'Printer', content: [{ title: '操作', type: 'list', items: [{type:'text', value:'IP: 192.168.3.3。感應登入。地點：2F小米、2F茶水、4F文具、4F財會。'},{type:'text', value:'維護找育豪#1236；紙張找寶惠#1209；操作找存青#1219。'},{type:'text', value:'第一次使用需手動輸入個人開機帳號/密碼來註冊登錄。'},{type:'text', value:'二樓業務小米區可傳真(2298-9515)。'},{type:'text', value:'二樓前門茶水區可傳真(2299-4687)。'},{type:'text', value:'四樓財會內可傳真(2290-1394)。'}] }] },
      { id: 'mail_f3', title: '信件回收', icon: 'Mail', content: [{ title: '操作', type: 'steps', items: [{type:'text', value:'至寄件備份將信件開啟，在上方工具列找到[動作]選取「回收此郵件」。'}] }] },
      { id: 'seat_f3', title: '辦公室樓層座位修改', icon: 'Map', content: [{ title: '申請', type: 'list', items: [{type:'text', value:'至內網文管中心下載最新版「樓層圖面修改申請表」編號ADW-054-02。'},{type:'text', value:'欲調閱圖面請下載「樓層圖面調閱申請表」編號ADW-054-01。'}] }] },
      { id: 'supplies_f3', title: '文具領取與滑鼠', icon: 'Mouse', content: [{ title: '領取', type: 'details', items: [{type:'text', value:'文具：4F 文具櫃(吳寶惠#1209)。滑鼠：4F [PC器材室]。'},{type:'text', value:'若有其他文具需求—洽詢吳寶惠#1209。'}] }] },
      { id: 'canteen_f3', title: '7 樓團膳費用', icon: 'Coffee', content: [{ title: '計費', type: 'important', items: [{type:'text', value:'中午：訂35/不訂60。晚上：35。沒吃不扣。洽慧珊#1212。'}] }] },
      { id: 'device_f3', title: '電腦密碼與設備申請', icon: 'Monitor', content: [{ title: '處理', type: 'list', items: [{type:'text', value:'密碼被鎖要等一小時後自動解開，或立即解鎖洽周佑式#1233、陳建宏#1452。'},{type:'text', value:'電腦配備申請/換新填寫[電腦配備申請單]，問題洽資管楊育豪#1236。'},{type:'text', value:'公務車租借填寫[公務車借用申請單]，問題洽管理部陳怡君#1234。'}] }] },
      { id: 'assets_f3', title: '固定資產管理', icon: 'Archive', content: [{ title: '流程', type: 'list', items: [{type:'text', value:'轉移退回選 [資管庫存]。報廢簽核：申請人>部長>陳總>采琴>江總>詩雯。'},{type:'text', value:'個人名下固資可至內網-個人作業-個人資產查詢。'},{type:'text', value:'查固資掛帳人：舊內網-上方進階搜尋-左側欄(依資產編號查詢)。'},{type:'text', value:'退回已退資產洽職安顏萓錦#1239。'}] }] },
      { id: 'visitor_f3', title: '訪客與廠商來訪', icon: 'UserCheck', content: [{ title: '接待', type: 'list', items: [{type:'text', value:'盡早至內網申請填寫_訪客申請。'},{type:'text', value:'請廠商吃公司團膳可向總機拿卷，小瓶水可找線上或研一研二窗口。'}] }] },
      { id: 'contact_f3', title: 'IT、設施與車位', icon: 'Phone', content: [{ title: '窗口', type: 'list', items: [{type:'text', value:'解鎖：周佑式#1233、建宏#1452；包裹：總機#1201；車位：胡家甄#1229。'},{type:'text', value:'網路異常：羅雲耀#1242、陳建宏#1452。'},{type:'text', value:'TIPTOP系統異常：廖慧岑#1223。'},{type:'text', value:'會議室/投影機設備：陳建宏#1452、徐睿浩#1221。'},{type:'text', value:'電燈、空調等設施：鄭惟峰#1205、李正華#1220、溫彥明#1235。'},{type:'text', value:'廁所清潔：清潔組長#1203。'}] }] }
    ]
  },
  {
    group: '人事假別與個人福利 (檔案 4)',
    id: 'f4',
    description: '結婚育兒津貼、喪葬補助、公假說明與離職流程',
    items: [
      { id: 'marriage_f4', title: '結婚津貼', icon: 'Heart', content: [{ title: '規範', type: 'list', items: [{type:'text', value:'填禮儀申請單交采珊#1226。無喜帖附證書；純登記附影本。禮金洽曉君#1213。'},{type:'text', value:'結婚禮金僅由公司補助，且只能申請一次。'},{type:'text', value:'結婚禮金由財會人員準備紅包後請長官帶至會場。'},{type:'text', value:'婚假規定請至內網文管中心查看最新資訊(ADW-009)及申請單(ADW-029-01)。'}] }] },
      { id: 'funeral_f4', title: '喪葬與育兒津貼', icon: 'Gift', content: [{ title: '規範', type: 'important', items: [{type:'text', value:'喪葬：公司補助約1900 / 福委1300。育兒：2200。時效30日內。'},{type:'text', value:'補助對象：職工本人直系及二等親內之親屬，以及配偶直系親屬。'},{type:'text', value:'需於死亡事實發生日起30日內提出申請。'},{type:'text', value:'需檢附訃文影本或死亡證明書影本。'},{type:'text', value:'育兒津貼：女職工需於產假銷假30日內提出；男職工需於新生兒出生30日內提出申請。'},{type:'text', value:'育兒津貼需檢附嬰兒出生證明文件影本。'}] }] },
      { id: 'sick_f4', title: '員工傷病補助', icon: 'ShieldAlert', content: [{ title: '規範', type: 'list', items: [{type:'text', value:'補助對象：職工本人因傷病住院。'},{type:'text', value:'需於銷假10日內提出申請。'},{type:'text', value:'需檢附診斷證明書或住院證明影本，並填寫支出證明單。'}] }] },
      { id: 'leave_f4', title: '公假與組織異動', icon: 'Briefcase', content: [{ title: '作業', type: 'list', items: [{type:'text', value:'參加一天內研討會，需進內網選請假單，選公假即可。'},{type:'text', value:'部門人員異動請部門主管寄信通知管理部采珊。'},{type:'text', value:'調部門要簽到陳總，部門內部異動簽到部長。'}] }] },
      { id: 'resign_f4', title: '離職簽核 (GREEN)', icon: 'LogOut', content: [{ title: '簽核流程', type: 'steps', items: [{type:'text', value:'正面：個人->組長->部長->陳總->江總。'},{type:'text', value:'反面：服務單位->採購(曾怡君)->商用機房(徐鴻文)->線上機房(林文哲)->財會(邱曉君)。最後交采珊。'}] }] },
      { id: 'contact_f4', title: '人事行政洽詢', icon: 'Phone', content: [{ title: '分機', type: 'list', items: [{type:'text', value:'假別/加班/勞健保/人員異動：黃采珊#1226。'}] }] }
    ]
  }
];

export const iconMap = {
  Plane: <Plane size={22}/>, Laptop: <Laptop size={22}/>, Music: <Music size={22}/>, 
  Utensils: <Utensils size={22}/>, ShoppingCart: <ShoppingCart size={22}/>,
  Calculator: <Calculator size={22}/>, Layers: <Layers size={22}/>, Phone: <Phone size={22}/>,
  Stamp: <Stamp size={22}/>, Archive: <Archive size={22}/>, List: <List size={22}/>,
  Globe: <Globe size={22}/>, Wifi: <Wifi size={22}/>, Gift: <Gift size={22}/>, LogOut: <LogOut size={22}/>,
  UserCog: <UserCog size={22}/>, Printer: <Printer size={22}/>, Home: <Home size={22}/>,
  UserCircle: <UserCircle size={22}/>, HelpCircle: <HelpCircle size={22}/>, Clock: <Clock size={22}/>,
  Monitor: <Monitor size={22}/>, Mail: <Mail size={22}/>, Map: <Map size={22}/>, Mouse: <Mouse size={22}/>,
  Key: <Key size={22}/>, Car: < Car size={22}/>, Users: <Users size={22}/>, Heart: <Heart size={22}/>,
  Calendar: <Calendar size={22}/>, FileText: <FileText size={22}/>, Receipt: <Receipt size={22}/>,
  UserPlus: <UserPlus size={22}/>, ShieldAlert: <ShieldAlert size={22}/>, Briefcase: <Briefcase size={22}/>,
  AlertCircle: <AlertCircle size={22}/>
};
