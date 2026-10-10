import { useCallback, useEffect, useMemo, useState } from 'react';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import { Activity, AppWindow, BookOpen, Braces, Check, ChevronDown, ChevronRight, CircleHelp, Code2, Command, File, FileCode2, FileJson, FileText, Folder, FolderOpen, GitBranch, Keyboard, PanelLeftClose, Play, Plus, RefreshCw, Save, Search, Settings2, ShieldCheck, Terminal, X } from 'lucide-react';

loader.config({ monaco });

const extLanguage = { js:'javascript', jsx:'javascript', mjs:'javascript', cjs:'javascript', ts:'typescript', tsx:'typescript', json:'json', css:'css', scss:'scss', html:'html', md:'markdown', mdx:'markdown', yml:'yaml', yaml:'yaml', py:'python', sh:'shell', ps1:'powershell', c:'c', cpp:'cpp', h:'c', sql:'sql', xml:'xml', svg:'xml', env:'plaintext', txt:'plaintext', gitignore:'plaintext' };
const extIcon = (name) => { const ext = name.split('.').pop().toLowerCase(); if (ext === 'json') return FileJson; if (['js','jsx','ts','tsx','css','html'].includes(ext)) return FileCode2; if (['md','mdx','txt'].includes(ext)) return FileText; return File; };
const getLanguage = (file) => extLanguage[file.split('/').pop().split('.').pop().toLowerCase()] || 'plaintext';
const flatten = (items) => items.flatMap(item => item.type === 'directory' ? [item, ...flatten(item.children || [])] : [item]);

function TreeNode({ node, depth = 0, activePath, onOpen }) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isFolder = node.type === 'directory';
  const Icon = isFolder ? (expanded ? FolderOpen : Folder) : extIcon(node.name);
  return <div>
    <button className={`tree-row ${activePath === node.path ? 'selected' : ''}`} style={{ '--depth': depth }} onClick={() => isFolder ? setExpanded(v => !v) : onOpen(node.path)} title={node.path}>
      {isFolder ? (expanded ? <ChevronDown size={13}/> : <ChevronRight size={13}/>) : <span className="tree-indent"/>}
      <Icon size={15} className={isFolder ? 'folder-icon' : 'file-icon'}/><span className="tree-name">{node.name}</span>
    </button>
    {isFolder && expanded && (node.children || []).map(child => <TreeNode key={child.path} node={child} depth={depth + 1} activePath={activePath} onOpen={onOpen}/>)}
  </div>;
}

export default function App() {
  const [workspace, setWorkspace] = useState(null);
  const [tree, setTree] = useState([]);
  const [tabs, setTabs] = useState([]);
  const [activePath, setActivePath] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [saved, setSaved] = useState({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [panelOpen, setPanelOpen] = useState(true);
  const [panelTab, setPanelTab] = useState('welcome');
  const [filter, setFilter] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('Ready');
  const [error, setError] = useState('');
  const [appInfo, setAppInfo] = useState({ name:'AnimeVault Studio', version:'0.1.0', platform:'desktop' });

  const refreshTree = useCallback(async () => {
    try { const next = await window.studio.listFiles(); setTree(next); setNotice('Workspace refreshed'); setError(''); }
    catch (e) { setError(e.message); }
  }, []);

  useEffect(() => {
    window.studio.getWorkspace().then(async result => { setWorkspace(result.root); if (result.root) await refreshTree(); });
    window.studio.getAppInfo().then(setAppInfo).catch(() => {});
  }, [refreshTree]);

  const openWorkspace = async () => {
    try {
      const result = await window.studio.chooseWorkspace();
      if (result.canceled) return;
      setWorkspace(result.root); setTabs([]); setDrafts({}); setSaved({}); setActivePath(null); setError('');
      const next = await window.studio.listFiles(); setTree(next); setNotice('Opened workspace');
    } catch (e) { setError(e.message); }
  };

  const openFile = async (path) => {
    const existing = tabs.find(tab => tab.path === path);
    if (existing) { setActivePath(path); return; }
    setBusy(true); setError('');
    try {
      const content = await window.studio.readFile(path);
      setTabs(current => [...current, { path, name:path.split('/').pop(), language:getLanguage(path) }]);
      setDrafts(current => ({ ...current, [path]:content }));
      setSaved(current => ({ ...current, [path]:content }));
      setActivePath(path); setNotice('Opened ' + path);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const closeTab = (path) => {
    const index = tabs.findIndex(tab => tab.path === path);
    const next = tabs.filter(tab => tab.path !== path);
    setTabs(next);
    if (activePath === path) setActivePath(next[Math.max(0, index - 1)]?.path || null);
  };

  const saveFile = async () => {
    if (!activePath || drafts[activePath] === saved[activePath]) return;
    setBusy(true); setError('');
    try {
      await window.studio.saveFile(activePath, drafts[activePath]);
      setSaved(current => ({ ...current, [activePath]:drafts[activePath] }));
      setNotice('Saved ' + activePath);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    const onKey = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') { event.preventDefault(); saveFile(); }
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'o') { event.preventDefault(); openWorkspace(); }
      if (event.key === 'Escape') { setFilter(''); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const activeTab = tabs.find(tab => tab.path === activePath);
  const dirty = activePath && drafts[activePath] !== saved[activePath];
  const flatFiles = useMemo(() => flatten(tree).filter(item => item.type === 'file' && item.path.toLowerCase().includes(filter.toLowerCase())), [tree, filter]);

  return <div className="ide-shell">
    <header className="titlebar">
      <div className="brand"><div className="brand-mark"><Braces size={19}/></div><div className="brand-copy"><strong>AnimeVault <span>Studio</span></strong><small>DEVELOPER ENVIRONMENT</small></div></div>
      <div className="titlebar-center"><span className="title-dot"/>{workspace ? workspace.split(/[\\/]/).filter(Boolean).pop() : 'No workspace open'}<span className="title-separator">/</span>{activeTab?.name || 'Welcome'}</div>
      <div className="titlebar-actions"><button className="icon-button" title="Toggle explorer" onClick={() => setSidebarOpen(v => !v)}><PanelLeftClose size={17}/></button><button className="icon-button" title="Refresh files" onClick={refreshTree}><RefreshCw size={16}/></button><div className="window-version">v{appInfo.version}</div></div>
    </header>

    <div className="workspace">
      <aside className="activity-bar">
        <button className="activity active" title="Explorer" onClick={() => setSidebarOpen(v => !v)}><AppWindow size={21}/><span/></button>
        <button className="activity" title="Search files" onClick={() => { setSidebarOpen(true); document.getElementById('file-search')?.focus(); }}><Search size={21}/></button>
        <button className="activity" title="Source control — coming in Phase 2" onClick={() => { setPanelOpen(true); setPanelTab('roadmap'); }}><GitBranch size={21}/></button>
        <div className="activity-spacer"/>
        <button className="activity" title="Keyboard shortcuts" onClick={() => { setPanelOpen(true); setPanelTab('shortcuts'); }}><Keyboard size={20}/></button>
        <button className="activity" title="About Studio" onClick={() => { setPanelOpen(true); setPanelTab('about'); }}><Settings2 size={20}/></button>
      </aside>

      {sidebarOpen && <aside className="sidebar">
        <div className="side-heading"><span>EXPLORER</span><button className="tiny-icon" onClick={openWorkspace} title="Open folder"><Plus size={16}/></button></div>
        <button className="workspace-heading" onClick={openWorkspace}><ChevronDown size={14}/><span>{workspace ? workspace.split(/[\\/]/).filter(Boolean).pop() : 'OPEN A FOLDER'}</span><FolderOpen size={15}/></button>
        {workspace ? <>
          <div className="search-wrap"><Search size={14}/><input id="file-search" placeholder="Filter files…" value={filter} onChange={e => setFilter(e.target.value)}/><kbd>⌘F</kbd></div>
          <div className="tree">
            {filter ? flatFiles.map(file => <button key={file.path} className={`tree-row search-result ${activePath === file.path ? 'selected' : ''}`} onClick={() => openFile(file.path)}><FileCode2 size={15}/><span className="tree-name">{file.path}</span></button>) : tree.map(node => <TreeNode key={node.path} node={node} activePath={activePath} onOpen={openFile}/>)}
            {!tree.length && <div className="empty-hint">This folder is empty.</div>}
          </div>
        </> : <div className="sidebar-empty"><div className="empty-illustration"><FolderOpen size={27}/></div><strong>Your workspace starts here</strong><p>Open any local folder to explore and edit its files.</p><button className="primary small" onClick={openWorkspace}>Open Folder</button></div>}
        <div className="sidebar-bottom"><ShieldCheck size={14}/><span>Local files stay on your device</span></div>
      </aside>}

      <main className="editor-area">
        <div className="tabs">
          {tabs.map(tab => <div key={tab.path} className={`editor-tab ${activePath === tab.path ? 'active' : ''}`} onClick={() => setActivePath(tab.path)}><span className="tab-icon"><FileCode2 size={14}/></span><span className="tab-name">{tab.name}</span>{drafts[tab.path] !== saved[tab.path] && <span className="dirty-dot"/>}<button className="tab-close" title="Close tab" onClick={e => { e.stopPropagation(); closeTab(tab.path); }}><X size={13}/></button></div>)}
          <div className="tabs-fill"/><button className="save-button" disabled={!dirty || busy} onClick={saveFile} title="Save (Ctrl+S)"><Save size={15}/><span>Save</span></button>
        </div>

        {activeTab ? <div className="editor-wrap"><div className="breadcrumbs"><span>{activeTab.path.split('/').slice(0,-1).join(' / ') || workspace?.split(/[\\/]/).filter(Boolean).pop()}</span><ChevronRight size={13}/><strong>{activeTab.name}</strong>{dirty && <span className="unsaved-label">UNSAVED</span>}</div><Editor height="100%" path={activePath} language={activeTab.language} value={drafts[activePath] ?? ''} onChange={value => setDrafts(current => ({ ...current, [activePath]:value ?? '' }))} theme="av-dark" beforeMount={monaco => { monaco.editor.defineTheme('av-dark', { base:'vs-dark', inherit:true, rules:[{token:'comment',foreground:'777B8C',fontStyle:'italic'},{token:'keyword',foreground:'F46D9B'},{token:'string',foreground:'B5D99C'}], colors:{'editor.background':'#101014','editor.foreground':'#D9D9E2','editorLineNumber.foreground':'#535360','editorLineNumber.activeForeground':'#E0E0EA','editorCursor.foreground':'#FF4F91','editor.selectionBackground':'#71314D70','editor.lineHighlightBackground':'#17171E','editorIndentGuide.background1':'#282832','editorIndentGuide.activeBackground1':'#454553','editorWidget.background':'#1B1B23','editorWidget.border':'#33333F'} }); }} options={{fontSize:13, fontFamily:'Cascadia Code, Consolas, monospace', minimap:{enabled:true,scale:0.8}, padding:{top:16,bottom:20}, scrollBeyondLastLine:false, automaticLayout:true, tabSize:2, wordWrap:'off', renderLineHighlight:'line', smoothScrolling:true, cursorBlinking:'smooth', bracketPairColorization:{enabled:true}, guides:{bracketPairs:true}, stickyScroll:{enabled:true}}}/></div> : <div className="welcome">
          <div className="welcome-glow"/><div className="welcome-logo"><Braces size={35}/></div><div className="eyebrow">YOUR WORKSPACE. YOUR RULES.</div><h1>Build something<br/><span>remarkable.</span></h1><p>A focused development environment for every project.<br/>Start with a folder, then make it yours.</p>
          <button className="primary" onClick={openWorkspace}><FolderOpen size={17}/> Open Folder <kbd>Ctrl O</kbd></button>
          <div className="quick-actions"><button onClick={() => { setPanelOpen(true); setPanelTab('shortcuts'); }}><Keyboard size={15}/> Keyboard shortcuts</button><button onClick={() => { setPanelOpen(true); setPanelTab('roadmap'); }}><Activity size={15}/> What's next</button></div>
          <div className="welcome-bottom"><div><span className="welcome-dot"/>MONACO EDITOR</div><div><ShieldCheck size={14}/> SECURE BY DEFAULT</div><div>BUILT FOR DEVELOPERS</div></div>
        </div>}

        {panelOpen && <div className="bottom-panel">
          <div className="panel-header"><div className="panel-tabs">{[['welcome','Welcome'],['roadmap','Roadmap'],['shortcuts','Shortcuts'],['about','About']].map(([id,label]) => <button key={id} className={panelTab === id ? 'active' : ''} onClick={() => setPanelTab(id)}>{label}</button>)}</div><button className="tiny-icon" onClick={() => setPanelOpen(false)} title="Hide panel"><X size={15}/></button></div>
          <div className="panel-content">
            {panelTab === 'welcome' && <><div className="panel-symbol"><Terminal size={17}/></div><div><strong>Developer panel</strong><p>Phase 1 is focused on the core editor: open a workspace, browse files, edit with Monaco, and save changes.</p></div><span className="panel-status"><span className="welcome-dot"/> READY</span></>}
            {panelTab === 'roadmap' && <div className="roadmap-list"><span className="done"><Check size={13}/> Phase 1 · Workspace, Monaco editor, file save</span><span><span className="phase-number">2</span> Integrated terminal & AnimeVault commands</span><span><span className="phase-number">3</span> Git panel, diagnostics & live preview</span><span><span className="phase-number">4</span> Optional AI coding assistant</span></div>}
            {panelTab === 'shortcuts' && <div className="shortcut-grid"><span>Save file</span><kbd>Ctrl S</kbd><span>Open folder</span><kbd>Ctrl O</kbd><span>Close tab</span><kbd>Click ×</kbd><span>Editor commands</span><kbd>F1</kbd></div>}
            {panelTab === 'about' && <><div className="panel-symbol"><Code2 size={17}/></div><div><strong>AnimeVault Studio <span className="build-tag">PHASE 1</span></strong><p>Version {appInfo.version} · {appInfo.platform} · Electron + React + Monaco Editor</p><p>Built as a separate developer tool inside the official AnimeVault repository.</p></div></>}
          </div>
        </div>}
        <footer className="statusbar"><div className="status-left"><span className="status-branch"><GitBranch size={13}/> main</span><span><Activity size={13}/> {workspace ? 'Workspace open' : 'No folder'}</span><span>{error ? <><X size={13}/> Error</> : <><Check size={13}/> {notice}</>}</span></div><div className="status-right">{activeTab && <><span>{getLanguage(activePath).toUpperCase()}</span><span>UTF-8</span><span>Spaces: 2</span></>}{busy && <span className="saving">WORKING…</span>}<span className="status-brand">ANIMEVAULT STUDIO</span></div></footer>
      </main>
    </div>
    {error && <div className="toast-error"><CircleHelp size={16}/><span>{error}</span><button onClick={() => setError('')}><X size={14}/></button></div>}
  </div>;
}
