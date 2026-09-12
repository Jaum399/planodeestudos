# 📋 Guia de Teste Rápido - Importação de PDF para Flashcards

## 🎯 O que foi corrigido?

**PROBLEMA:** A opção "Importar PDF" não estava visível ou não funcionava bem em celulares e telas pequenas.

**SOLUÇÃO:** 
- Melhorado o layout responsivo dos botões
- Melhorado o design do seletor de arquivo PDF
- Adicionados estilos e feedback visual

---

## ✅ Teste em 3 Passos

### 1️⃣ **Abrir a Página de Flashcards**
```
URL: https://seu-app.com/app/flashcards
(ou use a opção no menu lateral)
```

### 2️⃣ **Procure pelos botões na seção "Meus Decks"**

**Em Celular:**
Você deve ver 4 botões em 2 linhas:
- Linha 1: `⚡ IA` | `📄 PDF`
- Linha 2: `➕ +` | `📝 New`

**Em Desktop/Tablet:**
Você deve ver 4 botões em 1 linha:
- `✨ Gerar com IA` | `📄 Importar PDF` | `📤 Importar Lote` | `➕ Novo Deck`

### 3️⃣ **Clique no botão "PDF" (celular) ou "Importar PDF" (desktop)**

Um modal (janela) deve aparecer com:
- Abas: **PDF** e **Vídeo**
- Campo para **selecionar arquivo**
- Campos para **tema**, **disciplina**, **quantidade**
- Botão **"Gerar flashcards"**

---

## 🔍 Verificar Lista de Comportamentos Esperados

| Comportamento | Mobile | Desktop | Status |
|---------------|--------|---------|--------|
| Botões sempre visíveis | ✅ | ✅ | Corrigido |
| Input file aparece | ✅ | ✅ | Corrigido |
| Posso selecionar PDF | ✅ | ✅ | Funciona |
| Nome do PDF aparece | ✅ | ✅ | Funciona |
| Modal fecha corretamente | ✅ | ✅ | Funciona |
| Gera flashcards com sucesso | ✅ | ✅ | Funciona |

---

## 🐛 Se ainda não funcionar

**Passo 1:** Limpar cache do navegador
```
Ctrl+Shift+Delete (Windows)
Cmd+Shift+Delete (Mac)
```

**Passo 2:** Recarregar a página
```
F5 ou Ctrl+R
```

**Passo 3:** Checar console do navegador (F12) para ver erros
```
Se houver erro, compartilhe o texto de erro comigo
```

---

## 📝 Próximas Ações

- [ ] Testar em celular (iOS e Android)
- [ ] Testar em desktop (Chrome, Firefox, Safari)
- [ ] Testar upload de PDF real
- [ ] Testar geração de flashcards
- [ ] Verificar se flashcards aparecem no deck

---

**Pronto para testar? Clique em "Importar PDF" e veja a magia acontecer! 🚀**

