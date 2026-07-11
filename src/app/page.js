"use client";

import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export default function Home() {
  // --- 状態（データ）の管理 ---
  const [titles, setTitles] = useState([]); // 作品一覧
  const [rankings, setRankings] = useState([]); // ランキング（全件）
  
  const [selectedTitleId, setSelectedTitleId] = useState(""); // 検索用: 選択された作品ID (文字列で一貫管理)
  const [filteredCharacters, setFilteredCharacters] = useState([]); // 検索用: キャラ一覧
  const [selectedCharacter, setSelectedCharacter] = useState(null); // 検索用: 確定したキャラ詳細

  // --- アニメ作品追加フォーム用の状態 ---
  const [newTitleName, setNewTitleName] = useState(""); // 新規追加する作品名

  // --- 管理フォーム用の状態 ---
  const [isFormOpen, setIsFormOpen] = useState(false); // フォームの開閉状態 (trueで表示)
  const [isEditMode, setIsEditMode] = useState(false); // false: 新規登録, true: 編集モード
  const [formCharacterId, setFormCharacterId] = useState(""); // 編集中のキャラID
  const [formTitleId, setFormTitleId] = useState(""); // フォーム用: 作品ID
  const [formCharacterName, setFormCharacterName] = useState(""); // フォーム用: キャラ名
  const [formLooks, setFormLooks] = useState(50);
  const [formPersonality, setFormPersonality] = useState(50);
  const [formVoice, setFormVoice] = useState(50);
  const [formCuteness, setFormCuteness] = useState(50);
  const [formOther, setFormOther] = useState(50);

  // --- 1. データを再取得する共通関数（画面のリフレッシュ用） ---
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

  // 画面が開いた瞬間にデータ取得
  useEffect(() => {
    refreshData();
  }, []);

  // --- 2. プルダウン連動処理 ---
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

  // --- 3. ランキングの行をタップした時の連動処理 ---
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
      const searchSection = document.getElementById("search-section");
      if (searchSection) {
        searchSection.scrollIntoView({ behavior: "smooth" });
      }
    }, 50);
  };

  // --- 4. 新規登録ボタン用の関数 ---
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

    setTimeout(() => {
      document.getElementById("manager-form")?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  // --- 5. 編集モードへ切り替える処理 ---
  const startEdit = () => {
    if (!selectedCharacter) return;
    setIsEditMode(true);
    setIsFormOpen(true); 
    setFormCharacterId(selectedCharacter.character_id);
    
    const matchedTitle = titles.find(t => String(t.name) === String(selectedCharacter.title_name));
    setFormTitleId(matchedTitle ? String(matchedTitle.id) : "");
    
    setFormCharacterName(selectedCharacter.character_name);
    setFormLooks(selectedCharacter.score_looks);
    setFormPersonality(selectedCharacter.score_personality);
    setFormVoice(selectedCharacter.score_voice);
    setFormCuteness(selectedCharacter.score_cuteness);
    setFormOther(selectedCharacter.score_other);
    
    setTimeout(() => {
      document.getElementById("manager-form")?.scrollIntoView({ behavior: "smooth" });
    }, 80);
  };

  // フォームを閉じてリセットする処理
  const closeAndResetForm = () => {
    setIsFormOpen(false); 
    setIsEditMode(false);
    setFormCharacterId("");
    setFormTitleId("");
    setFormCharacterName("");
    setFormLooks(50);
    setFormPersonality(50);
    setFormVoice(50);
    setFormCuteness(50);
    setFormOther(50);
  };

  // --- 6. アニメ作品を新しく追加する処理 ---
  const handleAddTitle = async (e) => {
    e.preventDefault();
    if (!newTitleName.trim()) {
      return alert("アニメ作品名を入力してください");
    }

    try {
      const { data, error } = await supabase
        .from("titles")
        .insert([{ name: newTitleName.trim() }])
        .select();

      if (error) throw error;

      alert(`🎬 「${newTitleName}」を新しく登録しました！`);
      setNewTitleName("");
      await refreshData();

      setIsFormOpen(true);
      if (data && data.length > 0) {
        setFormTitleId(String(data[0].id));
      }
      setTimeout(() => {
        document.getElementById("manager-form")?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    } catch (err) {
      alert("❌ 作品の登録に失敗しました: " + err.message);
    }
  };

  // --- 7. キャラクター登録・更新ボタンが押された時の処理 ---
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formTitleId || !formCharacterName.trim()) {
      return alert("作品名とキャラクター名は必須です");
    }

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

      if (updateError) return alert("更新エラー: " + updateError.message);

      const scoreItems = [
        { name: "looks", old: selectedCharacter.score_looks, new: formLooks },
        { name: "personality", old: selectedCharacter.score_personality, new: formPersonality },
        { name: "voice", old: selectedCharacter.score_voice, new: formVoice },
        { name: "cuteness", old: selectedCharacter.score_cuteness, new: formCuteness },
        { name: "other", old: selectedCharacter.score_other, new: formOther },
      ];

      for (const item of scoreItems) {
        if (Number(item.old) !== Number(item.new)) {
          await supabase.from("score_histories").insert({
            character_id: formCharacterId,
            item_name: item.name,
            old_score: Number(item.old),
            new_score: Number(item.new)
          });
        }
      }
      alert(`${formCharacterName} の点数を見直しました！履歴も保存されました。`);
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

      if (insertError) return alert("登録エラー: " + insertError.message);
      alert(`${formCharacterName} を新しく登録しました！`);
    }

    await refreshData();
    closeAndResetForm(); 
  };

  // --- 8. Supabase Storage 画像直接アップロード処理 ---
  const handleImageUpload = async (characterId, event) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `c_${characterId}.${fileExt}`;

    try {
      const { data: storageData, error: storageError } = await supabase.storage
        .from("character-images")
        .upload(fileName, file, {
          contentType: file.type,
          upsert: true,
        });

      if (storageError) throw storageError;

      const { data: { publicUrl } } = supabase.storage
        .from("character-images")
        .getPublicUrl(fileName);

      const { error: dbError } = await supabase
        .from("characters")
        .update({ image_url: publicUrl })
        .eq("id", characterId);

      if (dbError) throw dbError;

      alert("✨ Supabase Storage への画像アップロードと更新が完了しました！");
      await refreshData();
    } catch (err) {
      alert("❌ 画像のアップロードに失敗しました: " + err.message);
      console.error(err);
    }
  };

  // --- 9. CSV保存処理 ---
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
    <main className="min-h-screen bg-gray-50 p-4 md:p-8 text-gray-800 pb-24">
      <div className="max-w-4xl mx-auto space-y-8">
        
        <h1 className="text-3xl font-bold text-center text-blue-600">アニメキャラ採点管理</h1>

        {/* ---------------- ① アニメキャラ検索（詳細カード） ---------------- */}
        <section id="search-section" className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 scroll-mt-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">🔍 キャラクター検索</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">アニメ作品</label>
              <select value={selectedTitleId ? String(selectedTitleId) : ""} onChange={handleTitleChange} className="w-full p-2 border border-gray-300 rounded-md bg-white">
                <option value="">-- 作品を選択 --</option>
                {titles.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">キャラクター名</label>
              <select onChange={handleCharacterChange} value={selectedCharacter ? String(selectedCharacter.character_id) : ""} disabled={!selectedTitleId} className="w-full p-2 border border-gray-300 rounded-md bg-white disabled:bg-gray-100">
                <option value="">-- キャラを選択 --</option>
                {filteredCharacters.map(c => <option key={c.character_id} value={String(c.character_id)}>{c.character_name}</option>)}
              </select>
            </div>
          </div>

          {selectedCharacter && (
            <div className="border-t pt-4 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="flex flex-col items-center gap-2">
                <div className="flex justify-center bg-gray-100 rounded-lg p-2 h-48 w-full items-center border overflow-hidden">
                  {selectedCharacter.image_url ? (
                    <img src={selectedCharacter.image_url} alt={selectedCharacter.character_name} className="max-h-full max-w-full object-contain rounded" />
                  ) : (
                    <span className="text-gray-400 text-sm">No Image</span>
                  )}
                </div>
                <label className="w-full cursor-pointer bg-zinc-700 hover:bg-amber-500 text-white hover:text-zinc-900 text-xs px-3 py-1.5 rounded font-medium transition-colors text-center shadow-sm">
                  📁 画像をアップロード
                  <input type="file" accept="image/*" onChange={(e) => handleImageUpload(selectedCharacter.character_id, e)} className="hidden" />
                </label>
              </div>

              <div className="md:col-span-2 space-y-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-baseline gap-3">
                    <span className="text-2xl font-bold text-gray-900">{selectedCharacter.character_name}</span>
                    <span className="text-sm text-gray-500">({selectedCharacter.title_name})</span>
                  </div>
                  <button onClick={startEdit} className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded font-medium transition-colors">
                    ✏️ 点数を見直す
                  </button>
                </div>
                
                <div className="flex gap-2 my-2 flex-wrap items-center">
                  <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold text-sm">現在の順位: {selectedCharacter.current_rank}位</span>
                  {selectedCharacter.title_honor && (
                    <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full font-bold text-sm">称号: {selectedCharacter.title_honor}</span>
                  )}
                  <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full font-bold text-sm">階級: {selectedCharacter.tier_name}</span>
                </div>
                
                {/* 📊 【新機能】横棒グラフ付きのステータスプレビューエリア */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 space-y-3 shadow-inner">
                  {[
                    { label: "ルックス", score: selectedCharacter.score_looks, color: "bg-pink-500" },
                    { label: "性格", score: selectedCharacter.score_personality, color: "bg-green-500" },
                    { label: "声 (声優)", score: selectedCharacter.score_voice, color: "bg-purple-500" },
                    { label: "可愛さ・格好良さ", score: selectedCharacter.score_cuteness, color: "bg-amber-500" },
                    { label: "その他 (補正点)", score: selectedCharacter.score_other, color: "bg-blue-500" },
                  ].map((item, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-gray-600">
                        <span>{item.label}</span>
                        <span>{item.score} / 100</span>
                      </div>
                      <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                        <div 
                          className={`${item.color} h-full rounded-full transition-all duration-500 ease-out`} 
                          style={{ width: `${item.score}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                  <div className="border-t border-gray-200 pt-2 flex justify-between items-center font-bold text-blue-600 text-sm">
                    <span>総合合計点数</span>
                    <span className="text-xl">{selectedCharacter.total_score} <span className="text-xs text-gray-400 font-normal">/ 500</span></span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>


        {/* ---------------- ➕ 新規キャラクター登録の起動ボタン ---------------- */}
        <div className="flex justify-center md:justify-end">
          <button 
            onClick={openNewRegisterForm}
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-xl shadow-sm hover:shadow transition-all duration-200 flex items-center justify-center gap-2 text-sm transform hover:-translate-y-0.5"
          >
            ➕ 新規キャラクターを登録する
          </button>
        </div>


        {/* ---------------- ② データ管理フォーム（開閉型） ---------------- */}
        {isFormOpen && (
          <section id="manager-form" className={`p-6 rounded-xl shadow-sm border transition-all duration-300 scroll-mt-6 ${isEditMode ? "bg-amber-50 border-amber-300" : "bg-white border-gray-200"}`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">
                {isEditMode ? `✏️ 点数の見直し中: ${formCharacterName}` : "📝 新しいキャラクターの登録"}
              </h2>
              <button onClick={closeAndResetForm} className="text-sm text-red-500 hover:text-red-700 underline font-medium">
                ❌ フォームを閉じる
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">所属アニメ作品 *</label>
                  <select value={formTitleId ? String(formTitleId) : ""} onChange={(e) => setFormTitleId(e.target.value)} disabled={isEditMode} className="w-full p-2 border border-gray-300 rounded-md bg-white disabled:bg-gray-100 text-sm">
                    <option value="">-- 作品を選択 --</option>
                    {titles.map(t => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">キャラクター名 *</label>
                  <input type="text" value={formCharacterName} onChange={(e) => setFormCharacterName(e.target.value)} disabled={isEditMode} placeholder="例: 後藤ひとり" className="w-full p-2 border border-gray-300 rounded-md bg-white disabled:bg-gray-100 text-sm" />
                </div>
              </div>

              {/* 採点スライダーエリア */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-3 border border-gray-100">
                <h3 className="text-xs font-bold text-gray-500 tracking-wider uppercase mb-1">各項目の採点 (0 〜 100)</h3>
                
                {[
                  { label: "ルックス", val: formLooks, set: setFormLooks },
                  { label: "性格", val: formPersonality, set: setFormPersonality },
                  { label: "声 (声優)", val: formVoice, set: setFormVoice },
                  { label: "可愛さ・格好良さ", val: formCuteness, set: setFormCuteness },
                  { label: "その他（補正点）", val: formOther, set: setFormOther },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 bg-white p-2 rounded border border-gray-200">
                    <span className="w-32 text-sm font-medium text-gray-700">{item.label}</span>
                    <input type="range" min="0" max="100" value={item.val} onChange={(e) => item.set(e.target.value)} className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    <span className="w-12 text-right font-bold text-gray-900 text-sm">{item.val}点</span>
                  </div>
                ))}
                
                <div className="text-right text-sm font-bold text-gray-700 pt-1">
                  リアルタイム合計点数: <span className="text-xl text-blue-600">{(Number(formLooks) + Number(formPersonality) + Number(formVoice) + Number(formCuteness) + Number(formOther))}</span> 点
                </div>
              </div>

              <button type="submit" className={`w-full p-3 rounded-md font-medium text-white transition-colors shadow-sm ${isEditMode ? "bg-amber-600 hover:bg-amber-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                {isEditMode ? "💾 採点結果を更新する（履歴に保存）" : "➕ 新規キャラクターを登録する"}
              </button>
            </form>
          </section>
        )}


        {/* ---------------- ③ アニメ作品の新規追加フォーム ---------------- */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h2 className="text-xl font-semibold mb-2 text-gray-700">🎬 新しいアニメ作品の登録</h2>
          <p className="text-xs text-gray-500 mb-4">ここにない作品のキャラクターを登録したい場合は、先に作品名を追加してください。</p>
          
          <form onSubmit={handleAddTitle} className="flex gap-3">
            <input 
              type="text" 
              value={newTitleName} 
              onChange={(e) => setNewTitleName(e.target.value)} 
              placeholder="例: ぼっち・ざ・ろっく！" 
              className="flex-1 p-2 border border-gray-300 rounded-md bg-white text-sm"
            />
            <button type="submit" className="bg-zinc-800 hover:bg-zinc-900 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm whitespace-nowrap">
              🎬 作品を追加
            </button>
          </form>
        </section>


        {/* ---------------- ④ 総合ランキング ---------------- */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">🏆 総合ランキング</h2>
            <button onClick={downloadCSV} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors">
              📥 CSV保存
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-200 text-sm font-medium text-gray-600">
                  <th className="p-3 w-16 text-center">順位</th>
                  <th className="p-3 w-32">称号 / 階級</th>
                  <th className="p-3">キャラ名 (作品名)</th>
                  <th className="p-3 text-center w-20">合計点</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {rankings.map((r) => (
                  <tr 
                    key={r.character_id} 
                    onClick={() => handleRowClick(r)}
                    className="hover:bg-blue-50/50 transition-colors cursor-pointer group"
                    title="タップして詳細を表示"
                  >
                    <td className="p-3 text-center font-bold text-gray-700 group-hover:text-blue-600">{r.current_rank}</td>
                    
                    <td className="p-3">
                      <div className="flex flex-col gap-1 items-start">
                        {r.title_honor && (
                          <span className="inline-block bg-amber-100 text-amber-800 text-[11px] px-2 py-0.5 rounded font-bold whitespace-nowrap">
                            {r.title_honor}
                          </span>
                        )}
                        <span className="inline-block bg-purple-100 text-purple-800 text-[11px] px-2 py-0.5 rounded font-bold whitespace-nowrap">
                          {r.tier_name}
                        </span>
                      </div>
                    </td>
                    
                    <td className="p-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center shrink-0 shadow-sm">
                          {r.image_url ? (
                            <img src={r.image_url} alt={r.character_name} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-gray-400 text-[10px]">No Img</span>
                          )}
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{r.character_name}</div>
                          <div className="text-xs text-gray-500">{r.title_name}</div>
                          
                          <label 
                            className="cursor-pointer inline-block bg-gray-100 hover:bg-amber-400 border border-gray-300 text-gray-700 hover:text-gray-900 text-[10px] px-1.5 py-0.5 rounded transition-all mt-0.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            📷 画像変更
                            <input type="file" accept="image/*" onChange={(e) => handleImageUpload(r.character_id, e)} className="hidden" />
                          </label>
                        </div>
                      </div>
                    </td>
                    <td className="p-3 text-center font-bold text-blue-600 text-base">{r.total_score}</td>
                  </tr>
                ))}
                {rankings.length === 0 && (
                  <tr>
                    <td colSpan="4" className="p-8 text-center text-gray-400">データがまだ登録されていません。</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </main>
  );
}