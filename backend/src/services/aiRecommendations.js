const { callGemini, QualityMetrics, TIMEOUTS, parseJsonResponse } = require('./geminiService');
const { RECOMMENDATION_PROMPTS } = require('../config/aiPrompts');

class AIRecommendationService {
  async analyzeUserLearningPattern(userStats) {
    const metrics = new QualityMetrics('user_analysis');

    try {
      const accuracyBySubject = userStats.subjectAccuracy || {};
      const weakAreas = Object.entries(accuracyBySubject)
        .filter(([, acc]) => acc < 60)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 3);

      const learningPace = this.detectLearningPace(userStats);
      const nextDifficulty = this.suggestDifficulty(userStats);

      const recommendedTopics = this.extractTopicsFromWeakAreas(weakAreas);

      metrics.parseSuccess = true;
      metrics.record({ retryCount: 0 });

      return {
        weak_areas: weakAreas.map(([subject, accuracy]) => ({ subject, accuracy })),
        learning_pace: learningPace,
        next_difficulty: nextDifficulty,
        recommended_topics: recommendedTopics,
      };
    } catch (error) {
      metrics.record({ parseSuccess: false, error: error.message });
      throw error;
    }
  }

  detectLearningPace(userStats) {
    const avgTimePerFlashcard = (userStats.totalTimeMinutes || 0) / (userStats.totalFlashcardsReviewed || 1);
    const overallAccuracy = userStats.overallAccuracy || 0;

    if (avgTimePerFlashcard < 0.5 && overallAccuracy > 75) return 'fast';
    if (avgTimePerFlashcard > 2 || overallAccuracy < 50) return 'slow';
    return 'medium';
  }

  suggestDifficulty(userStats) {
    const overallAccuracy = userStats.overallAccuracy || 0;

    if (overallAccuracy < 40) return 'iniciante';
    if (overallAccuracy < 70) return 'intermediário';
    return 'avançado';
  }

  extractTopicsFromWeakAreas(weakAreas) {
    return weakAreas.map(([subject]) => {
      const commonTopicsMap = {
        'Anatomia': ['Sistema nervoso', 'Sistema cardiovascular', 'Órgãos internos'],
        'Fisiologia': ['Respiração', 'Circulação', 'Metabolismo'],
        'Farmacologia': ['Mecanismos de ação', 'Efeitos colaterais', 'Interações'],
        'Direito': ['Constituição', 'Processo civil', 'Direito penal'],
        'Português': ['Interpretação', 'Gramática', 'Redação'],
      };
      return commonTopicsMap[subject] || [`Fundamentos de ${subject}`, `Prática em ${subject}`];
    }).flat();
  }

  async suggestDecksWithAI(userAnalysis, availableDecks, userProfile) {
    const metrics = new QualityMetrics('deck_suggestion');

    try {
      const analysisJson = JSON.stringify(userAnalysis, null, 2);
      const decksJson = JSON.stringify(
        availableDecks.slice(0, 20).map(d => ({
          id: d._id,
          name: d.name,
          subject: d.subject,
          rating: d.rating || 0,
          usageCount: d.usage_count || 0,
        })),
        null,
        2
      );

      const prompt = RECOMMENDATION_PROMPTS.suggestDeck
        .replace('{{userAnalysis}}', analysisJson)
        .replace('{{deckList}}', decksJson);

      const raw = await callGemini(prompt, null, {
        timeout: TIMEOUTS.recommendation,
        temperature: 0.5, // Moderate for balanced recommendations
        topP: 0.9,
      });

      metrics.responseLength = raw.length;

      const suggestions = parseJsonResponse(raw);
      if (!Array.isArray(suggestions)) throw new Error('Invalid_suggestions_array');

      const validated = suggestions
        .filter(s => s.deck_id && typeof s.confidence === 'number')
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3)
        .map(s => ({
          deck_id: s.deck_id,
          reason: s.reason || 'personalized',
          confidence: Math.min(Math.max(s.confidence, 0), 1),
          justification: s.justification || '',
        }));

      if (validated.length === 0) throw new Error('No_valid_suggestions');

      metrics.parseSuccess = true;
      metrics.record({ retryCount: 0 });
      return validated;
    } catch (error) {
      metrics.record({ parseSuccess: false, error: error.message });
      return this.fallbackDeckSuggestions(userAnalysis, availableDecks);
    }
  }

  fallbackDeckSuggestions(userAnalysis, availableDecks) {
    if (!userAnalysis.weak_areas || userAnalysis.weak_areas.length === 0) {
      return availableDecks.slice(0, 3).map((d, i) => ({
        deck_id: d._id,
        reason: 'peer_favorite',
        confidence: 0.7 - i * 0.1,
        justification: 'Populares entre seus peers',
      }));
    }

    const weakSubjects = userAnalysis.weak_areas.map(w => w.subject);
    const relevant = availableDecks
      .filter(d => weakSubjects.some(s => d.subject?.toLowerCase().includes(s.toLowerCase())))
      .sort((a, b) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 3);

    return relevant.map((d, i) => ({
      deck_id: d._id,
      reason: 'weak_area',
      confidence: 0.85 - i * 0.15,
      justification: `Melhora sua área fraca: ${d.subject}`,
    }));
  }

  async generateStudyStrategy(userAnalysis, userProfile) {
    const metrics = new QualityMetrics('study_strategy');

    try {
      const prompt = `Baseado na análise do aluno:
- Áreas fracas: ${userAnalysis.weak_areas.map(w => `${w.subject} (${w.accuracy}%)`).join(', ')}
- Ritmo de aprendizado: ${userAnalysis.learning_pace}
- Próxima dificuldade: ${userAnalysis.next_difficulty}
- Objetivo: ${userProfile.goal}

Sugira uma estratégia de estudo personalizada com 3-4 passos concretos e prazos. Retorne SOMENTE JSON:
{
  "strategy": "título breve",
  "steps": [
    {"step": 1, "action": "ação específica", "estimated_hours": número},
    ...
  ],
  "rationale": "por que esta estratégia ajuda este aluno"
}`;

      const raw = await callGemini(prompt, null, {
        timeout: TIMEOUTS.recommendation,
        temperature: 0.6,
      });

      metrics.responseLength = raw.length;
      const parsed = parseJsonResponse(raw);

      metrics.parseSuccess = true;
      metrics.record({ retryCount: 0 });
      return parsed;
    } catch (error) {
      metrics.record({ parseSuccess: false, error: error.message });
      return this.fallbackStrategy(userAnalysis);
    }
  }

  fallbackStrategy(userAnalysis) {
    return {
      strategy: 'Reforço de áreas fracas',
      steps: userAnalysis.weak_areas.slice(0, 3).map((area, i) => ({
        step: i + 1,
        action: `Revisar e reforçar ${area.subject}`,
        estimated_hours: 3 + (i * 2),
      })),
      rationale: 'Foco em consolidar as matérias mais frágeis para melhorar desempenho geral',
    };
  }
}

module.exports = new AIRecommendationService();
