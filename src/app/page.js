"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

const ITEM_LABELS = {
  looks: "ルックス",
  personality: "性格",
  voice: "声 (声優)",
  cuteness: "可愛さ・格好良さ",
  other: "その他 (補正点)"
};

export default function Home() {
  const [titles, setTitles] = useState([]);
  const [rankings, setRankings] = useState([]);
  const [selectedTitleId, setSelectedTitleId] = useState("");
  const [filteredCharacters, setFilteredCharacters] = useState([]);
  const [selectedCharacter, setSelectedCharacter] = useState(null);
  const [scoreHistories, setScoreHistories] = useState([]);

  const [newTitleName, setNewTitleName] = useState("");

  // --- 管理フォーム用の状態（特定のボタンで開閉する制御） ---
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [formCharacterId, setFormCharacterId] = useState("");
  const [formTitleId, setFormTitleId] = useState("");
  const [formCharacterName, setFormCharacterName] = useState("");
  const [formLooks, setFormLooks] = useState(50);
  const [formPersonality, setFormPersonality] = useState(50);
  const [formVoice, setFormVoice] = useState(50);
  const [formCuteness, setFormCuteness] = useState(50);
  const [formOther, setFormOther] = useState(50);

  // 登録・編集フォーム専用の内訳用状態
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

  const refreshData = async () => {
    const { data: titleData } = await supabase.from("titles").select("*").order("name");
    setTitles(titleData || []);

    const { data: rankData } = await supabase.from("v_character_rankings").select("*");
    setRankings(rankData || []);

    if (selectedCharacter) {
      const updatedChar = rankData?.find(r => String(r.character_id) === String(selectedCharacter.character_id));
      setSelectedCharacter(updatedChar || null);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  useEffect(() => {
    const fetchScoreHistories = async () => {
      if (!selectedCharacter) {
        setScoreHistories([]);
        return;
      }
      const { data, error } = await supabase
        .from("score_histories")
        .select("*")
        .eq("character_id", selectedCharacter.character_id)
        .order("created_at", { ascending: false });

      if (!error) setScoreHistories(data || []);
    };
    fetchScoreHistories();
  }, [selectedCharacter]);

  useEffect(() => {
    if (showLooksDetail) {
      const total = Number(formLooksFace) + Number(formLooksHair) + Number(formLooksBody) + Number(formLooksBust) + Number(formLooksExpression);
      setFormLooks(total);
    }
  }, [formLooksFace, formLooksHair, formLooksBody, formLooksBust, formLooksExpression, showLooksDetail]);

  useEffect(() => {
    if (showOtherDetail) {
      const total = Number(formOtherSense) + Number(formOtherAbility) + Number(formOtherCleanliness) + Number(formOtherAge);
      setFormOther(total);
    }
  }, [formOtherSense, formOtherAbility, formOtherCleanliness, formOtherAge, showOtherDetail]);


  const handleTitleChange = (e) => {
    const titleId = e.target.value;
    setSelectedTitleId(titleId);
    setSelectedCharacter(null);
    if (titleId === "") {
      setFilteredCharacters([]);
      return;
    }
    const chosenTitle = titles.find(t => String(t.id) === String(titleId));
    if (chosenTitle) {
      const chars = rankings.filter(r => String(r.title_name) === String(chosenTitle.name));
      setFilteredCharacters(chars);
    }
  };

  const handleCharacterChange = (e) => {
    const charId = e.target.value;
    if (charId === "") {
      setSelectedCharacter(null);
      return;
    }
    const charDetail = rankings.find(r => String(r.character_id) === String(charId));
    setSelectedCharacter(charDetail);
  };

  const handleRowClick = (characterDetail) => {
    if (!characterDetail) return;
    setSelectedCharacter(characterDetail);
    
    if (titles && titles.length > 0) {
      const matchedTitle = titles.find(t => String(t.name) === String(characterDetail.title_name));
      if (matchedTitle) {
        setSelectedTitleId(String(matchedTitle.id));
        const chars = rankings.filter(r => String(r.title_name) === String(matchedTitle.name));
        setFilteredCharacters(chars);
      }
    }
    setTimeout(() => {
      document.getElementById("search-section")?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const openNewRegisterForm = () => {
    setIsEditMode(false);
    setIsFormOpen(true); 
    setFormCharacterId("");
    setFormTitleId("");
    setFormCharacterName("");
    setFormLooks(50);
    setFormPersonality(50);
    setFormVoice(50);
    setFormCuteness(50);
    setFormOther(50);

    setShowLooksDetail(false);
    setFormLooksFace(25);
    setFormLooksHair(7);
    setFormLooksBody(5);
    setFormLooksBust(7);
    setFormLooksExpression(6);

    setShowOtherDetail(false);
    setFormOtherSense(25);
    setFormOtherAbility(12);
    setFormOtherCleanliness(7);
    setFormOtherAge(6);
  };

  const startEdit = () => {
    if (!selectedCharacter) return;
    setIsEditMode(true);
    setIsFormOpen(true); 
    setFormCharacterId(selectedCharacter.character_id);
    const matchedTitle = titles.find(t => String(t.name) === String(selectedCharacter.title_name));
    setFormTitleId(matchedTitle ? String(matchedTitle.id) : "");
    setFormCharacterName(selectedCharacter.character_name);
    
    const looks = selectedCharacter.score_looks;
    setFormLooks(looks);
    setFormPersonality(selectedCharacter.score_personality);
    setFormVoice(selectedCharacter.score_voice);
    setFormCuteness(selectedCharacter.score_cuteness);
    
    const other = selectedCharacter.score_other;
    setFormOther(other);

    setShowLooksDetail(false);
    const lf = Math.round(looks * 0.5);
    const lh = Math.round(looks * 0.15);
    const lb = Math.round(looks * 0.1);
    const lbu = Math.round(looks * 0.15);
    setFormLooksFace(lf);
    setFormLooksHair(lh);
    setFormLooksBody(lb);
    setFormLooksBust(lbu);
    setFormLooksExpression(looks - (lf + lh + lb + lbu)); 

    setShowOtherDetail(false);
    const os = Math.round(other * 0.5);
    const oa = Math.round(other * 0.25);
    const oc = Math.round(other * 0.15);
    setFormOtherSense(os);
    setFormOtherAbility(oa);
    setFormOtherCleanliness(oc);
    setFormOtherAge(other - (os + oa + oc)); 
  };

  const closeAndResetForm = () => {
    setIsFormOpen(false); 
    setIsEditMode(false);
  };

  const handleAddTitle = async (e) => {
    e.preventDefault();
    if (!newTitleName.trim()) return alert("アニメ作品名を入力してください");
    try {
      const { data, error } = await supabase.from("titles").insert([{ name: newTitleName.trim() }]).select();
      if (error) throw error;
      alert(`🎬 「${newTitleName}」を登録しました！`);
      setNewTitleName("");
      await refreshData();
      setIsFormOpen(true);
      if (data && data.length > 0) setFormTitleId(String(data[0].id));
    } catch (err) {
      alert("❌ 登録失敗: " + err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formTitleId || !formCharacterName.trim()) return alert("作品名とキャラクター名は必須です");

    try {
      if (isEditMode) {
        const { error: updateError } = await supabase
          .from("characters")
          .update({
            character_name: formCharacterName,
            score_looks: Number(formLooks),
            score_personality: Number(formPersonality),
            score_voice: Number(formVoice),
            score_cuteness: Number(formCuteness),
            score_other: Number(formOther),
          })
          .eq("id", formCharacterId);

        if (updateError) throw new Error("基本情報更新エラー: " + updateError.message);

        const scoreItems = [
          { name: "looks", old: selectedCharacter.score_looks, new: formLooks },
          { name: "personality", old: selectedCharacter.score_personality, new: formPersonality },
          { name: "voice", old: selectedCharacter.score_voice, new: formVoice },
          { name: "cuteness", old: selectedCharacter.score_cuteness, new: formCuteness },
          { name: "other", old: selectedCharacter.score_other, new: formOther },
        ];

        const historyInserts = [];
        for (const item of scoreItems) {
          if (Number(item.old) !== Number(item.new)) {
            historyInserts.push({
              character_id: Number(formCharacterId), 
              item_name: item.name,
              old_score: Number(item.old),
              new_score: Number(item.new)
            });
          }
        }

        if (historyInserts.length > 0) {
          const { error: historyError } = await supabase
            .from("score_histories")
            .insert(historyInserts);

          if (historyError) {
            throw new Error("履歴保存エラー:\n" + historyError.message);
          }
        }

        alert(`✨ ${formCharacterName} の点数と変更履歴を更新しました！`);
      } else {
        const { error: insertError } = await supabase
          .from("characters")
          .insert([{
            title_id: Number(formTitleId),
            character_name: formCharacterName,
            score_looks: Number(formLooks),
            score_personality: Number(formPersonality),
            score_voice: Number(formVoice),
            score_cuteness: Number(formCuteness),
            score_other: Number(formOther),
            image_url: null
          }]);
        if (insertError) throw new Error("新規登録エラー: " + insertError.message);
        alert(`✨ ${formCharacterName} を登録しました！`);
      }

      await refreshData();
      closeAndResetForm();
    } catch (err) {
      alert("❌ システムエラー:\n" + err.message);
      console.error(err);
    }
  };

  const handleImageUpload = async (characterId, event) => {
    const file = event.target.files[0];
    if (!file) return;
    const fileExt = file.name.split('.').pop();
    const fileName = `c_${characterId}.${fileExt}`;
    try {
      const { error: storageError } = await supabase.storage.from("character-images").upload(fileName, file, { contentType: file.type, upsert: true });
      if (storageError) throw storageError;
      const { data: { publicUrl } } = supabase.storage.from("character-images").getPublicUrl(fileName);
      const { error: dbError } = await supabase.from("characters").update({ image_url: publicUrl }).eq("id", characterId);
      if (dbError) throw dbError;
      alert("✨ 画像アップロード完了！");
      await refreshData();
    } catch (err) {
      alert("❌ アップロード失敗: " + err.message);
    }
  };

  const downloadCSV = () => {
    if (rankings.length === 0) return alert("データがありません");
    const headers = ["順位", "称号", "Tier", "キャラクター名", "作品名", "合計点", "ルックス", "性格", "声", "可愛さ", "その他"];
    const rows = rankings.map(r => [
      r.current_rank, r.title_honor || "なし", r.tier_name, r.character_name, r.title_name, r.total_score,
      r.score_looks, r.score_personality, r.score_voice, r.score_cuteness, r.score_other
    ]);
    const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `アニメキャラランキング_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-gray-100 p-2 md:p-8 text-gray-800 pb-28 font-sans antialiased select-none">
      <div className="max-w-4xl mx-auto space-y-4 md:space-y-8">
        
        {/* タイトル：アニメキャラ採点管理 */}
        <h1 className="text-2xl md:text-3xl font-black text-center text-blue-600 tracking-tight py-2">アニメキャラ採点管理</h1>

        {/* ---------------- ① アニメキャラ検索（詳細・プレビュー） ---------------- */}
        <section id="search-section" className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200 scroll-mt-4">
          <h2 className="text-lg font-bold mb-3 text-gray-700 flex items-center gap-1">🔍 データベース照会</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">所属作品</label>
              <select value={selectedTitleId ? String(selectedTitleId) : ""} onChange={handleTitleChange} className="w-full p-3 border border-gray-300 rounded-xl bg-gray-50 font-medium text-sm active:scale-[0.99] transition-transform">
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
              <div className="flex flex-col items-center gap-2">
                <div className="flex justify-center bg-gray-50 rounded-xl p-2 h-44 w-full items-center border overflow-hidden">
                  {selectedCharacter.image_url ? (
                    <img src={selectedCharacter.image_url} alt={selectedCharacter.character_name} className="max-h-full max-w-full object-contain rounded-lg shadow-sm" />
                  ) : (
                    <span className="text-gray-400 text-xs">No Image</span>
                  )}
                </div>
                <label className="w-full cursor-pointer bg-zinc-800 text-white text-xs px-3 py-2.5 rounded-xl font-bold transition-all text-center active:scale-95 shadow-sm">
                  📷 画像を変更
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(selectedCharacter.character_id, e)} className="hidden" />
                </label>
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xl font-black text-gray-900">{selectedCharacter.character_name}</span>
                    <span className="text-xs text-gray-400 font-medium">{selectedCharacter.title_name}</span>
                  </div>
                  <button onClick={startEdit} className="bg-blue-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl active:scale-95 transition-transform shadow-sm">
                    ✏️ 修正
                  </button>
                </div>
                
                <div className="flex gap-1.5 flex-wrap">
                  <span className="bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg font-extrabold text-xs">{selectedCharacter.current_rank}位</span>
                  {selectedCharacter.title_honor && (
                    <span className="bg-amber-50 text-amber-800 px-2.5 py-1 rounded-lg font-extrabold text-xs">{selectedCharacter.title_honor}</span>
                  )}
                  <span className="bg-purple-50 text-purple-700 px-2.5 py-1 rounded-lg font-extrabold text-xs">{selectedCharacter.tier_name}</span>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-2xl border border-gray-100 space-y-2.5">
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
                        <div className={`${item.color} h-full rounded-full transition-all duration-500`} style={{ width: `${item.score}%` }}></div>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-2 flex justify-between items-center font-black text-blue-600 text-xs">
                    <span>総合合計点数</span>
                    <span className="text-lg">{selectedCharacter.total_score} <span className="text-[10px] text-gray-400 font-normal">/ 500</span></span>
                  </div>
                </div>
              </div>

              {/* 履歴タイムライン */}
              <div className="col-span-1 md:col-span-3 border-t pt-3 mt-1">
                <h3 className="text-xs font-bold text-gray-600 mb-2">📈 査定変更履歴</h3>
                {scoreHistories.length > 0 ? (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 text-[11px]">
                    {scoreHistories.map((h) => {
                      const diff = Number(h.new_score) - Number(h.old_score);
                      return (
                        <div key={h.id} className="flex justify-between items-center bg-gray-50 border p-2 rounded-xl">
                          <span className="font-medium text-gray-600">{ITEM_LABELS[h.item_name]} : {h.old_score} ➔ {h.new_score}</span>
                          <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${diff > 0 ? "text-blue-600 bg-blue-50" : "text-red-600 bg-red-50"}`}>
                            {diff > 0 ? `+${diff}` : diff}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 text-center py-2 bg-gray-50 rounded-xl border border-dashed">履歴なし（初期データ）</p>
                )}
              </div>
            </div>
          )}
        </section>

        {/* ---------------- ② 登録・編集フォーム (モーダル仕様) ---------------- */}
        {isFormOpen && (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 backdrop-blur-xs">
            <section id="manager-form" className="bg-white w-full md:max-w-lg rounded-t-3xl md:rounded-2xl p-5 space-y-4 max-h-[92vh] overflow-y-auto border shadow-2xl">
              <div className="flex justify-between items-center border-b pb-2">
                <h2 className="text-base font-black text-gray-800">{isEditMode ? "✏️ キャラクター再査定" : "📝 新規キャラクター登録"}</h2>
                <button onClick={closeAndResetForm} className="text-sm text-red-500 font-bold p-1">✕ 閉じる</button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">所属作品 *</label>
                    <select value={formTitleId ? String(formTitleId) : ""} onChange={(e) => setFormTitleId(e.target.value)} disabled={isEditMode} className="w-full p-3 border rounded-xl bg-gray-50 text-sm disabled:opacity-50">
                      <option value="">-- 作品を選択 --</option>
                      {titles.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">キャラクター名 *</label>
                    <input type="text" value={formCharacterName} onChange={(e) => setFormCharacterName(e.target.value)} disabled={isEditMode} placeholder="名前を入力" className="w-full p-3 border rounded-xl bg-gray-50 text-sm disabled:opacity-50" />
                  </div>
                </div>

                <div className="bg-gray-50 p-3 rounded-2xl space-y-3 border">
                  <h3 className="text-xs font-bold text-gray-400 tracking-wider uppercase">採点スライダー</h3>
                  
                  {/* ルックス */}
                  <div className="bg-white p-3 rounded-xl border space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-700">
                      <span>ルックス</span>
                      <span className="text-pink-600 text-sm">{formLooks}点</span>
                    </div>
                    {!showLooksDetail ? (
                      <input type="range" min="0" max="100" value={formLooks} onChange={(e) => setFormLooks(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-600" />
                    ) : (
                      <div className="text-[11px] font-bold text-gray-400 bg-pink-50/50 p-1 rounded text-center">⚠️ 内訳連動モード（自動計算中）</div>
                    )}
                    <div className="text-right">
                      <button type="button" onClick={() => setShowLooksDetail(!showLooksDetail)} className="text-[11px] text-pink-600 hover:text-pink-800 underline font-extrabold">
                        {showLooksDetail ? "✕ 内訳を閉じる" : "📐 ルックスの内訳を細かく計算"}
                      </button>
                    </div>
                    {showLooksDetail && (
                      <div className="pt-2 border-t space-y-2 bg-pink-50/30 p-2 rounded-lg">
                        {[
                          { label: "顔", max: 50, val: formLooksFace, set: setFormLooksFace },
                          { label: "髪型·髪色", max: 15, val: formLooksHair, set: setFormLooksHair },
                          { label: "体型", max: 10, val: formLooksBody, set: setFormLooksBody },
                          { label: "バスト", max: 15, val: formLooksBust, set: setFormLooksBust },
                          { label: "表情", max: 10, val: formLooksExpression, set: setFormLooksExpression },
                        ].map((sub, sidx) => (
                          <div key={sidx} className="space-y-0.5 bg-white p-1.5 rounded border border-pink-100">
                            <div className="flex justify-between text-[11px] text-gray-600 font-bold">
                              <span>{sub.label}</span>
                              <span className="text-pink-600">{sub.val}点</span>
                            </div>
                            <input type="range" min="0" max={sub.max} value={sub.val} onChange={(e) => sub.set(e.target.value)} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-pink-500" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 性格 */}
                  <div className="bg-white p-3 rounded-xl border space-y-1">
                    <div className="flex justify-between text-xs font-bold text-gray-700">
                      <span>性格</span>
                      <span className="text-green-600">{formPersonality}点</span>
                    </div>
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={formPersonality} 
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600" 
                      onChange={(e) => setFormPersonality(e.target.value)} 
                    />
                  </div>

                  {/* 声 */}
                  <div className="bg-white p-3 rounded-xl border space-y-1">
                    <div className="flex justify-between text-xs font-bold text-gray-700">
                      <span>声 (声優)</span>
                      <span className="text-purple-600">{formVoice}点</span>
                    </div>
                    <input type="range" min="0" max="100" value={formVoice} onChange={(e) => setFormVoice(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
                  </div>

                  {/* 可愛さ */}
                  <div className="bg-white p-3 rounded-xl border space-y-1">
                    <div className="flex justify-between text-xs font-bold text-gray-700">
                      <span>可愛さ・格好良さ</span>
                      <span className="text-amber-600">{formCuteness}点</span>
                    </div>
                    <input type="range" min="0" max="100" value={formCuteness} onChange={(e) => setFormCuteness(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-600" />
                  </div>

                  {/* その他 */}
                  <div className="bg-white p-3 rounded-xl border space-y-2">
                    <div className="flex justify-between text-xs font-bold text-gray-700">
                      <span>その他 (補正点)</span>
                      <span className="text-blue-600 text-sm">{formOther}点</span>
                    </div>
                    {!showOtherDetail ? (
                      <input type="range" min="0" max="100" value={formOther} onChange={(e) => setFormOther(e.target.value)} className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    ) : (
                      <div className="text-[11px] font-bold text-gray-400 bg-blue-50/50 p-1 rounded text-center">⚠️ 内訳連動モード（自動計算中）</div>
                    )}
                    <div className="text-right">
                      <button type="button" onClick={() => setShowOtherDetail(!showOtherDetail)} className="text-[11px] text-blue-600 hover:text-blue-800 underline font-extrabold">
                        {showOtherDetail ? "✕ 内訳を閉じる" : "📐 その他の内訳を細かく計算"}
                      </button>
                    </div>
                    {showOtherDetail && (
                      <div className="pt-2 border-t space-y-2 bg-blue-50/30 p-2 rounded-lg">
                        {[
                          { label: "センス", max: 50, val: formOtherSense, set: setFormOtherSense },
                          { label: "能力", max: 25, val: formOtherAbility, set: setFormOtherAbility },
                          { label: "清潔", max: 15, val: formOtherCleanliness, set: setFormOtherCleanliness },
                          { label: "年齢", max: 10, val: formOtherAge, set: setFormOtherAge },
                        ].map((sub, sidx) => (
                          <div key={sidx} className="space-y-0.5 bg-white p-1.5 rounded border border-blue-100">
                            <div className="flex justify-between text-[11px] text-gray-600 font-bold">
                              <span>{sub.label}</span>
                              <span className="text-blue-600">{sub.val}点</span>
                            </div>
                            <input type="range" min="0" max={sub.max} value={sub.val} onChange={(e) => sub.set(e.target.value)} className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right text-xs font-black text-gray-700 pt-1">
                    リアルタイム合計: <span className="text-xl text-blue-600">{(Number(formLooks) + Number(formPersonality) + Number(formVoice) + Number(formCuteness) + Number(formOther))}</span> 点
                  </div>
                </div>

                <button type="submit" className="w-full p-3.5 bg-blue-600 text-white rounded-xl font-bold shadow-md active:scale-[0.98] text-sm">
                  {isEditMode ? "💾 査定内容を確定する" : "➕ 新規キャラクターを追加"}
                </button>
              </form>
            </section>
          </div>
        )}

        {/* 🎬 作品登録 */}
        <section className="bg-white p-4 rounded-2xl shadow-sm border border-gray-200">
          <h2 className="text-sm font-bold mb-1.5 text-gray-700">🎬 新規アニメ作品マスタ登録</h2>
          <form onSubmit={handleAddTitle} className="flex gap-2">
            <input type="text" value={newTitleName} onChange={(e) => setNewTitleName(e.target.value)} placeholder="作品名を入力" className="flex-1 p-2.5 border rounded-xl bg-gray-50 text-xs" />
            <button type="submit" className="bg-zinc-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap">追加</button>
          </form>
        </section>

        {/* 💡 【復活ポイント】PC環境（大画面）の時に右上に綺麗に並ぶ「新規キャラクター登録」の起動ボタン */}
        <div className="hidden md:flex justify-end pr-1 -mb-2">
          <button 
            onClick={openNewRegisterForm}
            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold px-5 py-3 rounded-xl shadow-md transition-all active:scale-95 text-sm flex items-center gap-1"
          >
            ➕ 新規キャラクターを登録する
          </button>
        </div>

        {/* 🏆 総合ランキング */}
        <section className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-base font-black text-gray-800">🏆 総合戦闘力ランキング</h2>
            <div className="flex gap-2">
              <button onClick={downloadCSV} className="bg-blue-50 text-blue-700 px-3 py-2 rounded-xl text-xs font-bold active:scale-95 transition-transform">
                📤 CSV保存
              </button>
            </div>
          </div>

          {/* PC用 */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500">
                  <th className="p-3 w-14 text-center">順位</th>
                  <th className="p-3 w-32">称号 / 階級</th>
                  <th className="p-3">キャラ名 (作品名)</th>
                  <th className="p-3 text-center w-16">合計</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {rankings.map((r) => (
                  <tr key={r.character_id} onClick={() => handleRowClick(r)} className="hover:bg-blue-50/40 transition-colors cursor-pointer group">
                    <td className="p-3 text-center font-black text-gray-500 group-hover:text-blue-600">{r.current_rank}</td>
                    <td className="p-3">
                      <div className="flex flex-col gap-0.5">
                        {r.title_honor && <span className="inline-block bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded font-bold w-max">{r.title_honor}</span>}
                        <span className="inline-block bg-purple-100 text-purple-800 text-[10px] px-1.5 py-0.5 rounded font-bold w-max">{r.tier_name}</span>
                      </div>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-gray-100 border overflow-hidden flex items-center justify-center shrink-0">
                          {r.image_url ? <img src={r.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[8px] text-gray-400">No</span>}
                        </div>
                        <div>
                          <div className="font-bold text-gray-900 group-hover:text-blue-600">{r.character_name}</div>
                          <div className="text-[10px] text-gray-400">{r.title_name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center font-black text-blue-600 text-sm">{r.total_score}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* スマホ用 */}
          <div className="block md:hidden space-y-2">
            {rankings.map((r) => (
              <div key={r.character_id} onClick={() => handleRowClick(r)} className="bg-gray-50 border border-gray-200/70 p-3 rounded-xl flex items-center justify-between active:bg-blue-50/50 transition-colors cursor-pointer">
                <div className="flex items-center gap-3">
                  <span className="text-base font-black text-blue-600 min-w-[24px] text-center">{r.current_rank}</span>
                  <div className="w-11 h-11 rounded-xl bg-gray-200 overflow-hidden flex items-center justify-center border shrink-0">
                    {r.image_url ? <img src={r.image_url} alt="" className="w-full h-full object-cover" /> : <span className="text-[9px] text-gray-400">No</span>}
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-gray-800 line-clamp-1">{r.character_name}</div>
                    <div className="text-[10px] text-gray-400 line-clamp-1">{r.title_name}</div>
                    <div className="flex gap-1 text-[9px] font-extrabold pt-0.5">
                      {r.title_honor && <span className="bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded">{r.title_honor}</span>}
                      <span className="bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">{r.tier_name}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right font-black text-blue-600 text-base pl-2">{r.total_score}<span className="text-[9px] text-gray-400 font-normal block">点</span></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* フローティングボタン（スマホの時だけ画面下に固定出現する） */}
      <div className="fixed bottom-0 inset-x-0 p-4 bg-gradient-to-t from-gray-100 via-gray-100 to-transparent md:hidden flex justify-center z-40">
        <button onClick={openNewRegisterForm} className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-1.5 text-sm">
          ➕ キャラクターを新規登録する
        </button>
      </div>
    </main>
  );
}
