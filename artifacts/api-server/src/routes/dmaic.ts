import { Router, type IRouter } from "express";
import {
  RunDmaicPipelineBody,
  RunDmaicPipelineResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

const DMAIC_SYSTEM_PROMPT = `Você é um Master Black Belt especialista em Lean Seis Sigma e Scrum.
Crie artefatos acionáveis em português do Brasil para um projeto DMAIC Ágil.
Responda SOMENTE com JSON válido, sem markdown, seguindo exatamente esta estrutura:
{
  "projectCharter":{"projectTitle":"","problemStatement":"","businessCase":"","expectedSavings":""},
  "teamSetup":{"productOwner":"","scrumMaster":"","beltSquadMembers":""},
  "vocCtq":[{"vocNeed":"","issue":"","ctqMetric":""}],
  "indicatorsY":{"primaryMetricY":"","operationalDefinition":"","targetGoal":"","baseline":""},
  "sipoc":{"suppliers":[""],"inputs":[""],"process":[""],"outputs":[""],"customers":[""]},
  "inOutMatrix":{"inScope":[""],"outOfScope":[""]},
  "msaValidation":[{"variable":"","gageRrStatus":"","recommendation":""}],
  "ishikawa":{"Método":[""],"Máquina":[""],"Material":[""],"Mão de Obra":[""],"Medição":[""],"Meio Ambiente":[""]},
  "gutPrioritization":[{"cause":"","gravity":"","urgency":"","tendency":"","gutScore":""}],
  "vitalXs":[{"id":"","description":"","specificGoalReduction":"","assignedSprint":""}],
  "hypotheses":[{"xVital":"","testType":"","pValueSimulated":"","conclusion":""}],
  "fmea":[{"step":"","failureMode":"","potentialCause":"","sev":"","occ":"","det":"","rpn":""}],
  "actionPlan":[{"what":"","why":"","where":"","when":"","who":"","how":"","howMuch":""}],
  "controlPlan":[{"parameter":"","specification":"","measurementFreq":"","responsible":"","reactionPlan":""}],
  "standardizationSop":[{"procedureName":"","pokaYokeFeature":"","ocapTrigger":""}]
}
Use de 2 a 4 itens por lista. Todos os valores devem ser strings. Seja específico ao problema e realista, mas não invente dados apresentados como medidos; use hipóteses e propostas quando necessário.`;

function parseModelJson(value: string): unknown {
  const withoutFences = value
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");

  return JSON.parse(withoutFences);
}

router.post("/dmaic/pipeline", async (req, res): Promise<void> => {
  const body = RunDmaicPipelineBody.safeParse(req.body);
  if (!body.success) {
    req.log.warn({ errors: body.error.flatten() }, "Invalid DMAIC pipeline request");
    res.status(400).json({ error: "Informe um problema com pelo menos 10 caracteres." });
    return;
  }

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    req.log.error("GOOGLE_API_KEY is not configured");
    res.status(503).json({ error: "A integração Gemini ainda não está configurada." });
    return;
  }

  try {
    const response = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `${DMAIC_SYSTEM_PROMPT}\n\nProblema do projeto:\n${body.data.problemStatement}`,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.25,
            maxOutputTokens: 8192,
          },
        }),
      },
    );

    if (!response.ok) {
      const details = await response.text();
      req.log.error(
        { status: response.status, details: details.slice(0, 500) },
        "Gemini pipeline request failed",
      );
      res.status(502).json({ error: "Não foi possível gerar o pipeline agora. Tente novamente." });
      return;
    }

    const payload = (await response.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
    };
    const text = payload.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      req.log.error("Gemini returned no pipeline content");
      res.status(502).json({ error: "A geração retornou uma resposta vazia. Tente novamente." });
      return;
    }

    const pipeline = RunDmaicPipelineResponse.safeParse(parseModelJson(text));
    if (!pipeline.success) {
      req.log.error(
        { errors: pipeline.error.flatten() },
        "Gemini returned an invalid DMAIC pipeline structure",
      );
      res.status(502).json({ error: "A geração ficou incompleta. Tente novamente." });
      return;
    }

    req.log.info("DMAIC pipeline generated");
    res.json(pipeline.data);
  } catch (error) {
    req.log.error({ error }, "Failed to generate DMAIC pipeline");
    res.status(502).json({ error: "Ocorreu um erro ao gerar o pipeline. Tente novamente." });
  }
});

export default router;