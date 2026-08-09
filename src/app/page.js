"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

// ==========================================
// 🔑 簡易ログイン設定 (お好みのID・パスワードに変更してください)
// ==========================================
const ADMIN_ID = "admin";
const ADMIN_PASS = "1234";

export default function Home() {
  // --- 簡易ログイン状態 ---
  const [isAdmin, setIsAdmin] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [inputAdminId, setInputAdminId] = useState("");
  const [inputAdminPass, setInputAdminPass] = useState("");

  // --- タブ管理 ('current' | 'history') ---
  const [activeTab, setActiveTab] = useState("current");

  // --- 現行データ用の状態 (v2対応) ---
  const [titles, setTitles] = useState([]);
  const [voiceActors, setVoiceActors] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [selectedTitleId, setSelectedTitleId] = useState("");
  const [filteredCharacters, setFilteredCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [scoreHistories, setScoreHistories] = useState([]);

  // --- 過去履歴スナップショット用の状態 ---
  const [snapshotNames, setSnapshotNames] = useState([]);
  const [selectedSnapshot, setSelectedSnapshot] = useState("");
  const [snapshotRankings, setSnapshotRankings] = useState([]);

  // --- マスタ追加用 ---
  const [newTitleName, setNewTitleName] = useState("");
  const [newVoiceActorName, setNewVoiceActorName] = useState("");

  // --- 管理フォーム用の状態 ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formCharacterId, setFormCharacterId] = useState("");
  const [formTitleId, setFormTitleId] = useState("");
  const [formVoiceActorId, setFormVoiceActorId] = useState("");
  const [formCharacterName, setFormCharacterName] = useState("");
  const [formRegisteredYear, setFormRegisteredYear] = useState(""); // 💡 登録年用の状態

  const [formLooks, setFormLooks] = useState(50);
  const [formPersonality, setFormPersonality] = useState(50);
  const [formVoice, setFormVoice] = useState(50);
  const [formCuteness, setFormCuteness] = useState(50);
  const [formOther, setFormOther] = useState(50);

  const [showLooksDetail, setShowLooksDetail] = useState(false);
  const [formLooksFace, setFormLooksFace] = useState(25);       
  const [formLooksHair, setFormLooksHair] = useState(7);        
  const [formLooksBody, setFormLooksBody] = useState(5);        
  const [formLooksBust, setFormLooksBust] = useState(7);        
  const [formLooksExpression, setFormLooksExpression] = useState(6); 

  const [showOtherDetail, setShowOtherDetail] = useState(false);
  const [formOtherSense, setFormOtherSense] = useState(25);       
  const [formOtherAbility, setFormOtherAbility] = useState(12);   
  const [formOtherCleanliness, setFormOtherCleanliness] = useState(7); 
  const [formOtherAge, setFormOtherAge] = useState(6);           

  // 🔑 初回読み込み時にログイン状態を記憶領域から復元
  useEffect(() => {
    const savedAdmin = localStorage.getItem("app_is_admin");
    if (savedAdmin === "true") {
      setIsAdmin(true);
    }
  }, []);

  // 🔑 簡易ログイン処理
  const handleSimpleLogin = (e) => {
    e.preventDefault();
    if (inputAdminId === ADMIN_ID && inputAdminPass === ADMIN_PASS) {
      setIsAdmin(true);
      localStorage.setItem("app_is_admin", "true");
      setShowLoginModal(false);
      setInputAdminId("");
      setInputAdminPass("");
      alert("✨ 管理者モードでログインしました");
    } else {
      alert("❌ ユーザーIDまたはパスワードが正しくありません");
    }
  };

  const handleSimpleLogout = () => {
    setIsAdmin(false);
    localStorage.removeItem("app_is_admin");
    alert("🔒 ログアウトしました（閲覧モードに戻ります）");
  };

  // データの初期取得 & 更新
  const refreshData = async () => {
    const { data: titleData } = await supabase.from("titles").select("*").order("name");
    setTitles(titleData || []);

    const { data: vaData } = await supabase.from("voice_actors").select("*").order("name");
    setVoiceActors(vaData || []);

    const { data: rankData } = await supabase.from("v2_character_rankings").select("*");
    setRankings(rankData || []);

    if (selectedCharacter) {
      const updatedChar = rankData?.find(r => String(r.character_id) === String(selectedCharacter.character_id));
      setSelectedCharacter(updatedChar || null);
    }

    const { data: snapData } = await supabase
      .from("score_snapshots_v2")
      .select("snapshot_name")
      .order("recorded_at", { ascending: false });

    if (snapData) {
      const uniqueNames = Array.from(new Set(snapData.map(s => s.snapshot_name)));
      setSnapshotNames(uniqueNames);
      if (uniqueNames.length > 0 && !selectedSnapshot) {
        setSelectedSnapshot(uniqueNames[0]);
      }
    }
  };

  useEffect(() => { refreshData(); }, []);

  // 過去スナップショットデータの取得
  useEffect(() => {
    const fetchSnapshotData = async () => {
      if (!selectedSnapshot) return setSnapshotRankings([]);
      const { data } = await supabase.from("v2_snapshot_export").select("*").eq("snapshot_name", selectedSnapshot);
      setSnapshotRankings(data || []);
    };
    if (activeTab === "history") fetchSnapshotData();
  }, [selectedSnapshot, activeTab]);

  // 内訳連動計算
  useEffect(() => {
    if (showLooksDetail) setFormLooks(Number(formLooksFace) + Number(formLooksHair) + Number(formLooksBody) + Number(formLooksBust) + Number(formLooksExpression));
  }, [formLooksFace, formLooksHair, formLooksBody, formLooksBust, formLooksExpression, showLooksDetail]);

  useEffect(() => {
    if (showOtherDetail) setFormOther(Number(formOtherSense) + Number(formOtherAbility) + Number(formOtherCleanliness) + Number(formOtherAge));
  }, [formOtherSense, formOtherAbility, formOtherCleanliness, formOtherAge, showOtherDetail]);

  // ハンドラー関係
  const handleTitleChange = (e) => {
    const titleId = e.target.value;
    setSelectedTitleId(titleId);
    setSelectedCharacter(null);
    if (titleId === "") return setFilteredCharacters([]);
    const chosenTitle = titles.find(t => String(t.id) === String(titleId));
    if (chosenTitle) setFilteredCharacters(rankings.filter(r => String(r.title_name) === String(chosenTitle.name)));
  };

  const handleCharacterChange = (e) => {
    const charId = e.target.value;
    if (charId === "") return setSelectedCharacter(null);
    setSelectedCharacter(rankings.find(r => String(r.character_id) === String(charId)));
  };

  const handleRowClick = (characterDetail) => {
    if (!characterDetail) return;
    setSelectedCharacter(characterDetail);
    const matchedTitle = titles.find(t => String(t.name) === String(characterDetail.title_name));
    if (matchedTitle) {
      setSelectedTitleId(String(matchedTitle.id));
      setFilteredCharacters(rankings.filter(r => String(r.title_name) === String(matchedTitle.name)));
    }
    setTimeout(() => document.getElementById("search-section")?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const openNewRegisterForm = () => {
    setIsEditMode(false);
    setIsFormOpen(true); 
    setFormCharacterId(""); setFormTitleId(""); setFormVoiceActorId(""); setFormCharacterName("");
    setFormRegisteredYear(new Date().getFullYear()); // デフォルトで今の年を入れる
    setFormLooks(50); setFormPersonality(50); setFormVoice(50); setFormCuteness(50); setFormOther(50);
    setShowLooksDetail(false); setShowOtherDetail(false);
  };

  const startEdit = () => {
    if (!selectedCharacter) return;
    setIsEditMode(true);
    setIsFormOpen(true); 
    setFormCharacterId(selectedCharacter.character_id);
    setFormTitleId(selectedCharacter.title_id ? String(selectedCharacter.title_id) : "");
    setFormVoiceActorId(selectedCharacter.voice_actor_id ? String(selectedCharacter.voice_actor_id) : "");
    setFormCharacterName(selectedCharacter.character_name);
    setFormRegisteredYear(selectedCharacter.registered_year || ""); // 💡 登録年のセット
    setFormLooks(selectedCharacter.score_looks); setFormPersonality(selectedCharacter.score_personality);
    setFormVoice(selectedCharacter.score_voice); setFormCuteness(selectedCharacter.score_cuteness);
    setFormOther(selectedCharacter.score_other);
    setShowLooksDetail(false); setShowOtherDetail(false);
  };

  const closeAndResetForm = () => { setIsFormOpen(false); setIsEditMode(false); };

  // データ更新（管理者用）
  const handleImageUpload = async (characterId, event) => {
    if (!isAdmin) return alert("管理者ログインが必要です");
    const file = event.target.files[0];
    if (!file) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `c_${characterId}.${fileExt}`;
    try {
      const { error: storageError } = await supabase.storage.from("character-images").upload(fileName, file, { contentType: file.type, upsert: true });
      if (storageError) throw storageError;
      const { data: { publicUrl } } = supabase.storage.from("character-images").getPublicUrl(fileName);
      const { error: dbError } = await supabase.from("characters_v2").update({ image_url: publicUrl }).eq("id", characterId);
      if (dbError) throw dbError;
      alert("✨ 画像アップロード完了！");
      await refreshData();
    } catch (err) { alert("❌ アップロード失敗: " + err.message); }
  };

  const handleAddTitle = async (e) => {
    e.preventDefault();
    if (!isAdmin) return alert("管理者ログインが必要です");
    if (!newTitleName.trim()) return alert("作品名を入力してください");
    try {
      const { data, error } = await supabase.from("titles").insert([{ name: newTitleName.trim() }]).select();
      if (error) throw error;
      alert(`🎬 「${newTitleName}」を登録しました！`);
      setNewTitleName("");
      await refreshData();
      if (data && data.length > 0) setFormTitleId(String(data[0].id));
    } catch (err) { alert("❌ 登録失敗: " + err.message); }
  };

  const handleAddVoiceActor = async (e) => {
    e.preventDefault();
    if (!isAdmin) return alert("管理者ログインが必要です");
    if (!newVoiceActorName.trim()) return alert("声優名を入力してください");
    try {
      const { data, error } = await supabase.from("voice_actors").insert([{ name: newVoiceActorName.trim() }]).select();
      if (error) throw error;
      alert(`🎙️ 「${newVoiceActorName}」を登録しました！`);
      setNewVoiceActorName("");
      await refreshData();
      if (data && data.length > 0) setFormVoiceActorId(String(data[0].id));
    } catch (err) { alert("❌ 登録失敗: " + err.message); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return alert("管理者ログインが必要です");
    if (!formTitleId || !formCharacterName.trim()) return alert("作品名とキャラクター名は必須です");
    try {
      const regYear = formRegisteredYear ? Number(formRegisteredYear) : null; // 💡 登録年の数値化

      if (isEditMode) {
        const { error: charError } = await supabase.from("characters_v2").update({ 
          title_id: Number(formTitleId), 
          voice_actor_id: formVoiceActorId ? Number(formVoiceActorId) : null, 
          character_name: formCharacterName,
          registered_year: regYear
        }).eq("id", formCharacterId);
        if (charError) throw new Error("基本情報更新エラー: " + charError.message);

        const { error: scoreError } = await supabase.from("scores").update({ score_looks: Number(formLooks), score_personality: Number(formPersonality), score_voice: Number(formVoice), score_cuteness: Number(formCuteness), score_other: Number(formOther), updated_at: new Date().toISOString() }).eq("character_id", formCharacterId);
        if (scoreError) throw new Error("点数更新エラー: " + scoreError.message);
        alert(`✨ ${formCharacterName} の情報を更新しました！`);
      } else {
        const { data: newChar, error: charError } = await supabase.from("characters_v2").insert([{ 
          title_id: Number(formTitleId), 
          voice_actor_id: formVoiceActorId ? Number(formVoiceActorId) : null, 
          character_name: formCharacterName, 
          registered_year: regYear,
          image_url: null 
        }]).select();
        if (charError) throw new Error("新規キャラ登録エラー: " + charError.message);
        const createdCharId = newChar[0].id;

        const { error: scoreError } = await supabase.from("scores").insert([{ character_id: createdCharId, score_looks: Number(formLooks), score_personality: Number(formPersonality), score_voice: Number(formVoice), score_cuteness: Number(formCuteness), score_other: Number(formOther) }]);
        if (scoreError) throw new Error("新規点数登録エラー: " + scoreError.message);
        alert(`✨ ${formCharacterName} を登録しました！`);
      }
      await refreshData();
      closeAndResetForm();
    } catch (err) { alert("❌ システムエラー:\n" + err.message); }
  };

  const handleDeleteCharacter = async () => {
    if (!isAdmin) return alert("管理者ログインが必要です");
    if (!selectedCharacter) return;
    if (!window.confirm(`⚠️ 「${selectedCharacter.character_name}」を本当に削除しますか？`)) return;
    try {
      const { error } = await supabase.from("characters_v2").delete().eq("id", selectedCharacter.character_id);
      if (error) throw error;
      alert(`🗑️ 「${selectedCharacter.character_name}」を削除しました。`);
      setSelectedCharacter(null);
      await refreshData();
    } catch (err) { alert("❌ 削除失敗: " + err.message); }
  };

  const downloadCSV = () => {
    const targetData = activeTab === "current" ? rankings : snapshotRankings;
    if (targetData.length === 0) return alert("データがありません");
    // 💡 登録年をCSVヘッダーと出力内容に追加
    const headers = ["順位", "称号", "Tier", "キャラクター名", "作品名", "担当声優", "登録年", "合計点", "ルックス", "性格", "声", "可愛さ", "その他"];
    const rows = targetData.map(r => [
      r.current_rank || "-", r.title_honor || "-", r.tier_name || "-",
      r.character_name, r.title_name, r.voice_actor_name || "未設定",
      r.registered_year ? `${r.registered_year}年` : "-", // 登録年
      r.total_score, r.score_looks, r.score_personality, r.score_voice, r.score_cuteness, r.score_other
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    const fileName = activeTab === "current" ? `アニメキャラランキング_${new Date().toISOString().split('T')[0]}.csv` : `過去点数表_${selectedSnapshot}.csv`;
    link.setAttribute("download", fileName);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const TableView = ({ data }) => (
    <>
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500">
              <th className="p-3 w-14 text-center">順位</th>
              <th className="p-3 w-32">称号 / Tier</th>
              <th className="p-3">キャラ名 (作品名)</th>
              <th className="p-3">担当声優 (CV)</th>
              <th className="p-3 text-center w-20 font-black">合計点</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs">
            {data.map((r, idx) => (
              <tr key={idx} onClick={() => activeTab === "current" && handleRowClick(r)} className={`transition-colors ${activeTab === "current" ? "hover:bg-blue-50/40 cursor-pointer group" : ""}`}>
                <td className="p-3 text-center font-black text-gray-500">{r.current_rank}位</td>
                <td className="p-3">
                  <div className="flex flex-col gap-1 items-start">
                    {r.title_honor ? (
                      <span className="inline-block bg-amber-100 text-amber-900 border border-amber-200 text-[10px] px-2 py-0.5 rounded-md font-black shadow-xs">🏆 {r.title_honor}</span>
                    ) : (
                      <span className="inline-block bg-gray-100 text-gray-400 text-[10px] px-2 py-0.5 rounded-md font-medium">一般層</span>
                    )}
                    {r.tier_name && (
                      <span className="inline-block bg-purple-100 text-purple-900 border border-purple-200 text-[10px] px-2 py-0.5 rounded-md font-black shadow-xs">⚡ {r.tier_name}</span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 border overflow-hidden flex items-center justify-center shrink-0">
                      {r.image_url ? <img src={r.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[8px] text-gray-400">No</span>}
                    </div>
                    <div>
                      <div className={`font-bold text-gray-900 ${activeTab === "current" ? "group-hover:text-blue-600" : ""}`}>{r.character_name}</div>
                      <div className="text-[10px] text-gray-400">
                        {r.title_name}
                        {/* 💡 登録年がある場合は表示 */}
                        {r.registered_year && <span className="ml-1 text-gray-400">({r.registered_year}年)</span>}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-3 font-medium text-gray-600">{r.voice_actor_name ? `🎙️ ${r.voice_actor_name}` : "-"}</td>
                <td className="p-3 text-center font-black text-blue-600 text-sm">{r.total_score || 0}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="block md:hidden space-y-2">
        {data.map((r, idx) => (
          <div key={idx} onClick={() => activeTab === "current" && handleRowClick(r)} className={`bg-gray-50 border border-gray-200/70 p-3 rounded-xl flex items-center justify-between ${activeTab === "current" ? "active:bg-blue-50/50 cursor-pointer" : ""}`}>
            <div className="flex items-center gap-3">
              <span className="text-base font-black text-blue-600 min-w-[24px] text-center">{r.current_rank}</span>
              <div className="w-11 h-11 rounded-xl bg-gray-200 overflow-hidden flex items-center justify-center border shrink-0">
                {r.image_url ? <img src={r.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[9px] text-gray-400">No</span>}
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-black text-gray-800 line-clamp-1">{r.character_name}</div>
                <div className="text-[10px] text-gray-400 line-clamp-1">
                  {r.title_name} {r.voice_actor_name && `(CV:${r.voice_actor_name})`}
                  {r.registered_year && ` [${r.registered_year}年]`}
                </div>
                <div className="flex gap-1 text-[9px] font-black pt-1">
                  {r.title_honor && <span className="bg-amber-100 text-amber-900 border border-amber-200 px-1.5 py-0.5 rounded">🏆 {r.title_honor}</span>}
                  {r.tier_name && <span className="bg-purple-100 text-purple-900 border border-purple-200 px-1.5 py-0.5 rounded">⚡ {r.tier_name}</span>}
                </div>
              </div>
            </div>
            <div className="text-right font-black text-blue-600 text-base pl-2">{r.total_score}<span className="text-[9px] text-gray-400 font-normal block">点</span></div>
          </div>
        ))}
      </div>
    </>
  );

  return (
    <main className="min-h-screen bg-gray-100 p-2 md:p-8 text-gray-800 pb-28 font-sans antialiased select-none">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-6">
        
        {/* ヘッダーエリア */}
        <div className="flex flex-col md:flex-row justify-between items-center bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <h1 className="text-2xl md:text-3xl font-black text-blue-600 tracking-tight">アニメキャラ採点管理</h1>
          <div className="mt-2 md:mt-0">
            {isAdmin ? (
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2.5 py-1 rounded-md border border-green-200">管理者モード中</span>
                <button onClick={handleSimpleLogout} className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1.5 rounded-lg font-bold border">🔓 ログアウト</button>
              </div>
            ) : (
              <button onClick={() => setShowLoginModal(true)} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-transform active:scale-95">
                🔒 管理者ログイン
              </button>
            )}
          </div>
        </div>

        {/* タブ切り替えバー */}
        <div className="flex bg-gray-200 p-1 rounded-2xl max-w-md mx-auto shadow-inner">
          <button onClick={() => setActiveTab("current")} className={`flex-1 py-2.5 text-xs md:text-sm font-extrabold rounded-xl transition-all ${activeTab === "current" ? "bg-white text-blue-600 shadow-md" : "text-gray-500 hover:text-gray-700"}`}>
            📊 現在の点数表 (最新)
          </button>
          <button onClick={() => setActiveTab("history")} className={`flex-1 py-2.5 text-xs md:text-sm font-extrabold rounded-xl transition-all ${activeTab === "history" ? "bg-white text-blue-600 shadow-md" : "text-gray-500 hover:text-gray-700"}`}>
            📜 過去の点数表履歴
          </button>
        </div>

        {activeTab === "current" && (
          <>
            {/* 🔍 データベース照会 */}
            <section id="search-section" className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 scroll-mt-4">
              <h2 className="text-lg font-bold mb-3 text-gray-700 flex items-center gap-1">🔍 データベース照会</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">所属作品</label>
                  <select value={selectedTitleId ? String(selectedTitleId) : ""} onChange={handleTitleChange} className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 font-medium text-sm">
                    <option value="">-- 作品を選択 --</option>
                    {titles.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">キャラクター名</label>
                  <select onChange={handleCharacterChange} value={selectedCharacter ? String(selectedCharacter.character_id) : ""} disabled={!selectedTitleId} className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 font-medium text-sm disabled:opacity-50">
                    <option value="">-- キャラを選択 --</option>
                    {filteredCharacters.map(c => <option key={c.character_id} value={String(c.character_id)}>{c.character_name}</option>)}
                  </select>
                </div>
              </div>

              {selectedCharacter && (
                <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                  
                  {/* 画像エリア */}
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex justify-center bg-gray-50 rounded-xl p-2 h-44 w-full items-center border overflow-hidden">
                      {selectedCharacter.image_url ? (
                        <img src={selectedCharacter.image_url} alt={selectedCharacter.character_name} className="max-h-full max-w-full object-contain rounded-lg shadow-sm" />
                      ) : (
                        <span className="text-gray-400 text-xs">No Image</span>
                      )}
                    </div>
                    {isAdmin && (
                      <label className="w-full cursor-pointer bg-zinc-800 text-white text-xs px-3 py-2.5 rounded-xl font-bold transition-all text-center active:scale-95 shadow-sm">
                        📷 画像を変更
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(selectedCharacter.character_id, e)} className="hidden" />
                      </label>
                    )}
                  </div>

                  {/* ステータスエリア */}
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-xl font-black text-gray-900">{selectedCharacter.character_name}</span>
                        <div className="text-xs text-gray-500 font-medium flex gap-2 items-center flex-wrap">
                          <span>🎬 {selectedCharacter.title_name}</span>
                          {selectedCharacter.voice_actor_name && (
                            <span className="text-blue-600 font-bold">🎙️ CV: {selectedCharacter.voice_actor_name}</span>
                          )}
                          {/* 💡 登録年の表示 */}
                          {selectedCharacter.registered_year && (
                            <span className="text-gray-400 font-bold">📅 {selectedCharacter.registered_year}年登録</span>
                          )}
                        </div>
                      </div>
                      
                      {isAdmin && (
                        <div className="flex gap-2">
                          <button onClick={startEdit} className="bg-blue-600 text-white text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform shadow-sm">✏️ 修正</button>
                          <button onClick={handleDeleteCharacter} className="bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold px-3 py-2 rounded-xl active:scale-95 transition-transform border border-red-200">🗑️ 削除</button>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-1.5 flex-wrap">
                      <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-extrabold text-xs">
                        {selectedCharacter.current_rank ? `${selectedCharacter.current_rank}位` : "-位"}
                      </span>
                      {selectedCharacter.title_honor && (
                        <span className="bg-amber-100 text-amber-900 border border-amber-200 px-2.5 py-1 rounded-lg font-black text-xs shadow-sm">🏆 {selectedCharacter.title_honor}</span>
                      )}
                      {selectedCharacter.tier_name && (
                        <span className="bg-purple-100 text-purple-900 border border-purple-200 px-2.5 py-1 rounded-lg font-black text-xs shadow-sm">⚡ {selectedCharacter.tier_name}</span>
                      )}
                    </div>
                    
                    <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 space-y-2">
                      {[
                        { label: "ルックス", score: selectedCharacter.score_looks, color: "bg-pink-500" },
                        { label: "性格", score: selectedCharacter.score_personality, color: "bg-green-500" },
                        { label: "声 (声優)", score: selectedCharacter.score_voice, color: "bg-purple-500" },
                        { label: "可愛さ・格好良さ", score: selectedCharacter.score_cuteness, color: "bg-amber-500" },
                        { label: "その他 (補正点)", score: selectedCharacter.score_other, color: "bg-blue-500" },
                      ].map((item, idx) => (
                        <div key={idx} className="space-y-0.5">
                          <div className="flex justify-between text-[11px] font-bold text-gray-500">
                            <span>{item.label}</span>
                            <span>{item.score}点</span>
                          </div>
                          <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                            <div className={`${item.color} h-full rounded-full`} style={{ width: `${item.score}%` }}></div>
                          </div>
                        </div>
                      ))}
                      <div className="border-t border-gray-200 pt-2 flex justify-between items-center font-black text-blue-600 text-xs">
                        <span>総合合計点数</span>
                        <span className="text-lg">{selectedCharacter.total_score} <span className="text-[10px] text-gray-400 font-normal">/ 500</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </section>

            {isAdmin && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                    <h2 className="text-xs font-bold mb-1.5 text-gray-700">🎬 作品マスタ追加</h2>
                    <form onSubmit={handleAddTitle} className="flex gap-2">
                      <input type="text" value={newTitleName} onChange={(e) => setNewTitleName(e.target.value)} placeholder="作品名を入力" className="flex-1 p-2 border rounded-xl bg-gray-50 text-xs" />
                      <button type="submit" className="bg-zinc-800 text-white px-3 py-2 rounded-xl text-xs font-bold">追加</button>
                    </form>
                  </section>

                  <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
                    <h2 className="text-xs font-bold mb-1.5 text-gray-700">🎙️ 声優マスタ追加</h2>
                    <form onSubmit={handleAddVoiceActor} className="flex gap-2">
                      <input type="text" value={newVoiceActorName} onChange={(e) => setNewVoiceActorName(e.target.value)} placeholder="声優名を入力" className="flex-1 p-2 border rounded-xl bg-gray-50 text-xs" />
                      <button type="submit" className="bg-zinc-800 text-white px-3 py-2 rounded-xl text-xs font-bold">追加</button>
                    </form>
                  </section>
                </div>

                <div className="hidden md:flex justify-end pr-1">
                  <button onClick={openNewRegisterForm} className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-3 rounded-xl shadow-md transition-all text-sm">
                    ➕ 新規キャラクターを登録する
                  </button>
                </div>
              </>
            )}

            {/* 🏆 総合ランキング */}
            <section className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex justify-between items-center mb-3">
                <h2 className="text-base font-black text-gray-800">🏆 総合戦闘力ランキング</h2>
                <button onClick={downloadCSV} className="bg-blue-50 text-blue-700 px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform">📤 CSV保存</button>
              </div>
              <TableView data={rankings} />
            </section>
          </>
        )}

        {/* 過去タブ */}
        {activeTab === "history" && (
          <section className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 space-y-4 min-h-[50vh]">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b pb-4">
              <div>
                <h2 className="text-base font-black text-gray-800 flex items-center gap-1">📜 過去の点数表アーカイブ</h2>
                <p className="text-xs text-gray-400 mt-0.5">当時のデータに基づき「称号」と「Tier」が再現されます</p>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select value={selectedSnapshot} onChange={(e) => setSelectedSnapshot(e.target.value)} className="w-full sm:w-auto p-2.5 border border-blue-200 rounded-xl bg-blue-50/50 font-bold text-xs text-blue-800 focus:outline-none">
                  {snapshotNames.length > 0 ? snapshotNames.map((name) => <option key={name} value={name}>📅 {name}</option>) : <option value="">過去データがありません</option>}
                </select>
                <button onClick={downloadCSV} className="bg-blue-50 text-blue-700 px-3 py-2.5 rounded-xl text-xs font-bold shrink-0">📤 CSV保存</button>
              </div>
            </div>
            {snapshotRankings.length > 0 ? <TableView data={snapshotRankings} /> : <div className="flex items-center justify-center h-48 text-gray-400 text-sm font-bold border-2 border-dashed rounded-xl">データが見つかりませんでした</div>}
          </section>
        )}

        {/* 🔐 簡易ログインモーダル */}
        {showLoginModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm space-y-4 border">
              <h2 className="text-lg font-black text-center text-gray-800">🔒 管理者ログイン</h2>
              <form onSubmit={handleSimpleLogin} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">ユーザー ID</label>
                  <input type="text" required value={inputAdminId} onChange={(e) => setInputAdminId(e.target.value)} className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm" placeholder="IDを入力" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">パスワード</label>
                  <input type="password" required value={inputAdminPass} onChange={(e) => setInputAdminPass(e.target.value)} className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm" placeholder="パスワードを入力" />
                </div>
                <div className="pt-2 flex gap-2">
                  <button type="button" onClick={() => setShowLoginModal(false)} className="flex-1 p-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm">キャンセル</button>
                  <button type="submit" className="flex-1 p-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm shadow-sm">ログイン</button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 登録・編集モーダル */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-xs">
            <section className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto border shadow-2xl">
              <div className="flex justify-between items-center border-b pb-2">
                <h2 className="text-base font-black text-gray-800">{isEditMode ? "✏️ キャラクター情報修正" : "📝 新規キャラクター登録"}</h2>
                <button onClick={closeAndResetForm} className="text-sm text-red-500 font-bold p-1">✕ 閉じる</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-500 mb-1">所属作品 *</label>
                      <select value={formTitleId} onChange={(e) => setFormTitleId(e.target.value)} className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm font-medium">
                        <option value="">-- 作品を選択 --</option>
                        {titles.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">担当声優 (CV)</label>
                      <select value={formVoiceActorId} onChange={(e) => setFormVoiceActorId(e.target.value)} className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm font-medium">
                        <option value="">-- 声優を選択 (任意) --</option>
                        {voiceActors.map(va => <option key={va.id} value={String(va.id)}>{va.name}</option>)}
                      </select>
                    </div>
                    {/* 💡 登録年入力枠 */}
                    <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">登録年</label>
                      <input type="number" value={formRegisteredYear} onChange={(e) => setFormRegisteredYear(e.target.value)} placeholder="例: 2017" className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm font-medium" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">キャラクター名 *</label>
                    <input type="text" value={formCharacterName} onChange={(e) => setFormCharacterName(e.target.value)} placeholder="名前を入力" className="w-full p-2.5 border rounded-xl bg-gray-50 text-sm font-medium" />
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-2xl space-y-3 border">
                  <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">採点スライダー</h3>
                  <div className="bg-white p-3 rounded-xl border space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-700"><span>ルックス</span><span className="text-pink-600 text-sm">{formLooks}点</span></div>
                    {!showLooksDetail ? <input type="range" min="0" max="100" value={formLooks} onChange={(e) => setFormLooks(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-600" /> : <div className="text-[11px] font-bold text-pink-500 bg-pink-50 p-1 rounded text-center">📐 内訳連動モード（合計: {formLooks}点）</div>}
                    <div className="text-right"><button type="button" onClick={() => setShowLooksDetail(!showLooksDetail)} className="text-[11px] text-pink-600 hover:text-pink-800 underline font-extrabold">{showLooksDetail ? "✕ 内訳を閉じる" : "📐 内訳を細かく計算"}</button></div>
                    {showLooksDetail && (
                      <div className="pt-2 border-t space-y-2 bg-pink-50/40 p-2 rounded-lg">
                        {[{ label: "顔 (最大50点)", max: 50, val: formLooksFace, set: setFormLooksFace }, { label: "髪型・髪色 (最大15点)", max: 15, val: formLooksHair, set: setFormLooksHair }, { label: "体型 (最大10点)", max: 10, val: formLooksBody, set: setFormLooksBody }, { label: "バスト (最大15点)", max: 15, val: formLooksBust, set: setFormLooksBust }, { label: "表情 (最大10点)", max: 10, val: formLooksExpression, set: setFormLooksExpression }].map((sub, sidx) => (
                          <div key={sidx} className="space-y-0.5 bg-white p-1.5 rounded border border-pink-100"><div className="flex justify-between text-[11px] text-gray-600 font-bold"><span>{sub.label}</span><span className="text-pink-600">{sub.val}点</span></div><input type="range" min="0" max={sub.max} value={sub.val} onChange={(e) => sub.set(e.target.value)} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500" /></div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="bg-white p-3 rounded-xl border space-y-1"><div className="flex justify-between text-xs font-bold text-gray-700"><span>性格</span><span className="text-green-600">{formPersonality}点</span></div><input type="range" min="0" max="100" value={formPersonality} onChange={(e) => setFormPersonality(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600" /></div>
                  <div className="bg-white p-3 rounded-xl border space-y-1"><div className="flex justify-between text-xs font-bold text-gray-700"><span>声 (声優)</span><span className="text-purple-600">{formVoice}点</span></div><input type="range" min="0" max="100" value={formVoice} onChange={(e) => setFormVoice(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" /></div>
                  <div className="bg-white p-3 rounded-xl border space-y-1"><div className="flex justify-between text-xs font-bold text-gray-700"><span>可愛さ・格好良さ</span><span className="text-amber-600">{formCuteness}点</span></div><input type="range" min="0" max="100" value={formCuteness} onChange={(e) => setFormCuteness(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600" /></div>
                  <div className="bg-white p-3 rounded-xl border space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-700"><span>その他 (補正点)</span><span className="text-blue-600 text-sm">{formOther}点</span></div>
                    {!showOtherDetail ? <input type="range" min="0" max="100" value={formOther} onChange={(e) => setFormOther(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" /> : <div className="text-[11px] font-bold text-blue-500 bg-blue-50 p-1 rounded text-center">📐 内訳連動モード（合計: {formOther}点）</div>}
                    <div className="text-right"><button type="button" onClick={() => setShowOtherDetail(!showOtherDetail)} className="text-[11px] text-blue-600 hover:text-blue-800 underline font-extrabold">{showOtherDetail ? "✕ 内訳を閉じる" : "📐 内訳を細かく計算"}</button></div>
                    {showOtherDetail && (
                      <div className="pt-2 border-t space-y-2 bg-blue-50/40 p-2 rounded-lg">
                        {[{ label: "センス (最大50点)", max: 50, val: formOtherSense, set: setFormOtherSense }, { label: "能力 (最大25点)", max: 25, val: formOtherAbility, set: setFormOtherAbility }, { label: "清潔 (最大15点)", max: 15, val: formOtherCleanliness, set: setFormOtherCleanliness }, { label: "年齢 (最大10点)", max: 10, val: formOtherAge, set: setFormOtherAge }].map((sub, sidx) => (
                          <div key={sidx} className="space-y-0.5 bg-white p-1.5 rounded border border-blue-100"><div className="flex justify-between text-[11px] text-gray-600 font-bold"><span>{sub.label}</span><span className="text-blue-600">{sub.val}点</span></div><input type="range" min="0" max={sub.max} value={sub.val} onChange={(e) => sub.set(e.target.value)} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" /></div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right text-xs font-black text-gray-700 pt-1 border-t">リアルタイム総合点: <span className="text-xl text-blue-600">{(Number(formLooks) + Number(formPersonality) + Number(formVoice) + Number(formCuteness) + Number(formOther))}</span> / 500 点</div>
                </div>
                <button type="submit" className="w-full p-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-md text-sm active:scale-[0.98] transition-transform">
                  {isEditMode ? "💾 更新を確定する" : "➕ 新規キャラクターを追加"}
                </button>
              </form>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
