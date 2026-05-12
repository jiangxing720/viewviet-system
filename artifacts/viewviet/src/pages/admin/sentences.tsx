import { useState } from "react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Upload, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

const SCENE_HEADERS = ["sentence", "languageCode", "sceneName", "pronunciation", "translationZh", "translationEn", "translationVi", "difficulty", "isPublished"];
const SCENE_EXAMPLE = `sentence,languageCode,sceneName,pronunciation,translationZh,translationEn,translationVi,difficulty,isPublished
Xin chào! Tôi muốn đặt bàn.,vi,餐厅,sin chào tôi muốn đặt bàn,你好！我想预定一张桌子。,Hello! I'd like to make a reservation.,Xin chào! Tôi muốn đặt bàn.,1,true
Bay đến Hà Nội mất bao lâu?,vi,机场,bay đến hà nội mất bao lâu,飞往河内需要多长时间？,How long does it take to fly to Hanoi?,Bay đến Hà Nội mất bao lâu?,2,true`;

const COMPLEX_HEADERS = ["sentence", "languageCode", "pronunciation", "translationZh", "translationEn", "translationVi", "grammarNotes", "context", "difficulty", "isPublished"];
const COMPLEX_EXAMPLE = `sentence,languageCode,pronunciation,translationZh,translationEn,translationVi,grammarNotes,context,difficulty,isPublished
Nếu tôi có thể nói tiếng Việt thì tôi đã không cần phiên dịch.,vi,,如果我会说越南语，我就不需要翻译了。,If I could speak Vietnamese I wouldn't need a translator.,Nếu tôi có thể nói tiếng Việt...,条件句 nếu...thì,商务,4,true`;

function parseCsv(text: string, requiredFields: string[]) {
  const lines = text.trim().split("\n").filter(l => l.trim());
  if (lines.length < 2) return { rows: [], errors: ["至少需要标题行和一行数据"] };
  const headers = lines[0].split(",").map(h => h.trim());
  const missing = requiredFields.filter(f => !headers.includes(f));
  if (missing.length > 0) return { rows: [], errors: [`缺少必要列：${missing.join(", ")}`] };
  const rows: any[] = [];
  const errors: string[] = [];
  lines.slice(1).forEach((line, i) => {
    const vals = line.split(",").map(v => v.trim());
    if (vals.every(v => !v)) return;
    const row: Record<string, any> = {};
    headers.forEach((h, j) => { row[h] = vals[j] ?? ""; });
    if (row.difficulty) row.difficulty = Number(row.difficulty) || 1;
    if (row.isPublished !== undefined) row.isPublished = row.isPublished === "true";
    if (!row.sentence) { errors.push(`第 ${i + 2} 行：sentence 为空`); return; }
    rows.push(row);
  });
  return { rows, errors };
}

type TabType = "scene" | "complex";

export default function AdminSentences() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [tab, setTab] = useState<TabType>("scene");
  const [sceneCsv, setSceneCsv] = useState("");
  const [complexCsv, setComplexCsv] = useState("");
  const [sceneLoading, setSceneLoading] = useState(false);
  const [complexLoading, setComplexLoading] = useState(false);
  const [sceneResult, setSceneResult] = useState<{ inserted: number; errors: any[] } | null>(null);
  const [complexResult, setComplexResult] = useState<{ inserted: number; errors: any[] } | null>(null);

  async function uploadScene() {
    const { rows, errors } = parseCsv(sceneCsv, ["sentence", "sceneName"]);
    if (errors.length > 0) { toast({ title: errors[0], variant: "destructive" }); return; }
    if (rows.length === 0) { toast({ title: "没有有效数据", variant: "destructive" }); return; }
    setSceneLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/scene-sentences/bulk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSceneResult(data);
      toast({ title: `成功导入 ${data.inserted} 条情景句子` });
    } catch (e: any) {
      toast({ title: e.message || "上传失败", variant: "destructive" });
    } finally {
      setSceneLoading(false);
    }
  }

  async function uploadComplex() {
    const { rows, errors } = parseCsv(complexCsv, ["sentence"]);
    if (errors.length > 0) { toast({ title: errors[0], variant: "destructive" }); return; }
    if (rows.length === 0) { toast({ title: "没有有效数据", variant: "destructive" }); return; }
    setComplexLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/complex-sentences/bulk`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setComplexResult(data);
      toast({ title: `成功导入 ${data.inserted} 条复杂句型` });
    } catch (e: any) {
      toast({ title: e.message || "上传失败", variant: "destructive" });
    } finally {
      setComplexLoading(false);
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/admin">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-4 h-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold">{t("admin.sentences")}</h1>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2 mb-8 border-b">
        {(["scene", "complex"] as TabType[]).map((tp) => (
          <button
            key={tp}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${tab === tp ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}
            onClick={() => setTab(tp)}
          >
            {tp === "scene" ? t("learn.scene_sentences") : t("learn.complex_sentences")}
          </button>
        ))}
      </div>

      {tab === "scene" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("learn.scene_sentences")} — CSV {t("admin.bulk_upload")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">必要列：sentence, sceneName（其余可选）</p>
              <div className="bg-muted/60 rounded-lg p-3 text-xs font-mono text-muted-foreground whitespace-pre overflow-x-auto">
                {SCENE_EXAMPLE}
              </div>
              <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setSceneCsv(SCENE_EXAMPLE)}>
                填入示例数据
              </Button>
            </div>
            <Textarea
              rows={10}
              placeholder="粘贴 CSV 内容..."
              value={sceneCsv}
              onChange={(e) => { setSceneCsv(e.target.value); setSceneResult(null); }}
              className="font-mono text-xs"
            />
            <div className="flex items-center gap-3">
              <Button onClick={uploadScene} disabled={sceneLoading || !sceneCsv.trim()}>
                <Upload className="w-4 h-4 mr-2" />
                {sceneLoading ? "上传中..." : "上传情景句子"}
              </Button>
              {sceneResult && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>成功 {sceneResult.inserted} 条</span>
                  {(sceneResult?.errors?.length ?? 0) > 0 && (
                    <Badge variant="destructive" className="text-xs">{sceneResult?.errors?.length} 错误</Badge>
                  )}
                </div>
              )}
            </div>
            {(sceneResult?.errors?.length ?? 0) > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
                {sceneResult?.errors?.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-destructive">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>行 {e.index + 1}：{e.error}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "complex" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("learn.complex_sentences")} — CSV {t("admin.bulk_upload")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">必要列：sentence（其余可选）</p>
              <div className="bg-muted/60 rounded-lg p-3 text-xs font-mono text-muted-foreground whitespace-pre overflow-x-auto">
                {COMPLEX_EXAMPLE}
              </div>
              <Button variant="ghost" size="sm" className="mt-2 text-xs" onClick={() => setComplexCsv(COMPLEX_EXAMPLE)}>
                填入示例数据
              </Button>
            </div>
            <Textarea
              rows={10}
              placeholder="粘贴 CSV 内容..."
              value={complexCsv}
              onChange={(e) => { setComplexCsv(e.target.value); setComplexResult(null); }}
              className="font-mono text-xs"
            />
            <div className="flex items-center gap-3">
              <Button onClick={uploadComplex} disabled={complexLoading || !complexCsv.trim()}>
                <Upload className="w-4 h-4 mr-2" />
                {complexLoading ? "上传中..." : "上传复杂句型"}
              </Button>
              {complexResult && (
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>成功 {complexResult.inserted} 条</span>
                  {(complexResult?.errors?.length ?? 0) > 0 && (
                    <Badge variant="destructive" className="text-xs">{complexResult?.errors?.length} 错误</Badge>
                  )}
                </div>
              )}
            </div>
            {(complexResult?.errors?.length ?? 0) > 0 && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-1">
                {complexResult?.errors?.map((e, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-destructive">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    <span>行 {e.index + 1}：{e.error}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
