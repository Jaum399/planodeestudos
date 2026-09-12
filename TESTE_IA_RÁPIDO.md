# 🧪 Teste Rápido - IA Gerando Flashcards Específicos

## ✅ 3 Passos para Testar

### Passo 1: Abrir Página de Flashcards
```
URL: https://seu-app.com/app/flashcards
ou Menu → Flashcards
```

### Passo 2: Clicar em "Gerar com IA"
Você verá uma janela com:
- Campo **Tema**
- Campo **Conteúdo** (opcional)
- Campo **Disciplina**
- Campo **Quantidade**

### Passo 3: Preencher Dados (Exemplos para Testar)

#### Exemplo 1: Medicina (Específico)
```
Tema: "Valores normais de eletrólitos"
Conteúdo: "K+ 3.5-5.0 mEq/L, Na+ 135-145 mEq/L, Cl- 98-107 mEq/L, Ca2+ 8.5-10.5 mg/dL"
Disciplina: "Medicina"
Quantidade: 8
```

#### Exemplo 2: Biologia (Específico)
```
Tema: "Fotossíntese - Reações Luminosas"
Conteúdo: "λ absorção clorofila a: 430-662 nm. Taxa fotossíntese máxima ~100 μmol CO2/m²/s. Eficiência: 10-15% da radiação"
Disciplina: "Biologia"
Quantidade: 6
```

#### Exemplo 3: Química (Específico)
```
Tema: "Equilíbrio Químico - Lei de Le Chatelier"
Conteúdo: "Para a reação N2 + 3H2 ⇌ 2NH3, Keq = [NH3]²/([N2][H2]³)"
Disciplina: "Química"
Quantidade: 5
```

---

## 🎯 Verificar Qualidade dos Flashcards

Após gerar, verifique se os cards têm:

| ✅ Bom | ❌ Ruim |
|--------|--------|
| "Qual é o valor de K+ normal?" | "O que é potássio?" |
| "Qual é o λ de absorção da clorofila a?" | "O que é fotossíntese?" |
| "Qual é a fórmula do equilíbrio?" | "Explique equilíbrio químico" |
| "Em qual situação a taxa aumenta?" | "Como funciona?" |

---

## 📊 Checklist de Sucesso

Marque se os flashcards:

- [ ] Contêm números/valores específicos?
- [ ] Evitam "O que é..." e "Explique..."?
- [ ] Perguntas são técnicas?
- [ ] Respostas são precisas?
- [ ] Aplicáveis em provas técnicas?

---

## 🐛 Se Algo Não Funcionar

**Problema:** IA retorna genéricos
```
Solução: Limpe cache (Ctrl+Shift+Delete) e recarregue (F5)
```

**Problema:** Erro 503 "IA indisponível"
```
Solução: Verifique se GOOGLE_GEMINI_API_KEY está configurada
        Tente novamente em alguns segundos
```

**Problema:** JSON inválido
```
Solução: Tente com um tema menor ou material mais curto
        Use Gemini em vez de OpenAI (mais estável)
```

---

**Pronto? Clique em "Gerar com IA" e veja flashcards muito melhores! 🚀**

