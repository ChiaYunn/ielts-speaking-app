<template>
  <div class="p-4 max-w-3xl mx-auto">
    <h1 class="text-2xl font-bold mb-4">英語口說練習</h1>
    <button @click="loadRandomArticle" class="btn mb-4">🔄 change news</button>

    <div class="mb-4">
      <!-- 用 v-html 顯示加了 mark 的文字 -->
      <p class="text-gray-700 whitespace-pre-wrap" v-html="highlightedText"></p>
    </div>

    <div class="mb-4 flex flex-wrap gap-2">
      <button @click="speakText" class="btn">🔁 Play</button>
      <button @click="pauseSpeech" class="btn">⏸️ Pause</button>
      <button @click="resumeSpeech" class="btn">▶️ Resume</button>
      <button @click="startRecording" class="btn" :disabled="isRecording">🎙️ Start</button>
      <button @click="stopRecording" class="btn" :disabled="!isRecording">🛑 Stop</button>
    </div>
    
    <div class="mb-2">Play progress：{{ playProgress }}%</div>
    <div class="mb-2">Time spent：{{ timer }} 秒</div>
    <div class="mb-4">Correct rate：{{ accuracy }}%</div>

    <div class="mt-4">
      <h2 class="font-semibold">The text you read out (including intermediate results):</h2>
      <p class="text-sm text-gray-600 whitespace-pre-wrap">{{ transcript }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'

const articles = ref([])
const originalText = ref('Loading article...')
const highlightedText = ref('')
const transcript = ref('')
const spokenText = ref('')
const accuracy = ref(0)
const timer = ref(0)
const isRecording = ref(false)

let utterance = null
let intervalId = null
let recognition = null
let finalTranscript = ''

// 播放進度百分比
const playProgress = ref(0)
// 目前唸到的單字索引
const currentWordIndex = ref(-1)

// 載入文章 JSON
onMounted(async () => {
  try {
    const res = await fetch('/cnn_articles.json')
    const data = await res.json()
    articles.value = data

    if (data.length > 0 && data[0].content) {
      originalText.value = data[0].content.trim()
      highlightedText.value = originalText.value
    } else {
      originalText.value = '⚠️ 找不到文章內容'
      highlightedText.value = originalText.value
    }
  } catch (err) {
    console.error('❌ 無法讀取 cnn_articles.json:', err)
    originalText.value = '❌ 無法載入文章'
    highlightedText.value = originalText.value
  }
})

// 更新高亮文字，將目前字用 <mark> 包起來
function updateHighlightedText() {
  const words = originalText.value.trim().split(/\s+/)
  highlightedText.value = words
    .map((word, i) => i === currentWordIndex.value ? `<mark>${word}</mark>` : word)
    .join(' ')
}

const speakText = () => {
  // 如果正在播放或暫停，先取消
  if (speechSynthesis.speaking || speechSynthesis.paused) {
    speechSynthesis.cancel()
  }

  utterance = new SpeechSynthesisUtterance(originalText.value)
  utterance.lang = 'en-US'

  utterance.onstart = () => {
    currentWordIndex.value = -1
    playProgress.value = 0
    updateHighlightedText()
  }

  utterance.onend = () => {
    currentWordIndex.value = -1
    playProgress.value = 100
    updateHighlightedText()
    console.log('🔚 播放完畢')
  }

  // 當每個單字開始唸時更新高亮及進度
  utterance.onboundary = (event) => {
    if (event.name === 'word') {
      const textBefore = originalText.value.slice(0, event.charIndex)
      const wordIndex = textBefore.trim().split(/\s+/).length - 1
      currentWordIndex.value = wordIndex >= 0 ? wordIndex : 0
      updateHighlightedText()

      const totalWords = originalText.value.trim().split(/\s+/).length
      playProgress.value = Math.min(100, Math.round(((wordIndex + 1) / totalWords) * 100))
    }
  }

  speechSynthesis.speak(utterance)
  console.log('🔊 開始播放')
}

const pauseSpeech = () => {
  if (speechSynthesis.speaking && !speechSynthesis.paused) {
    speechSynthesis.pause()
    console.log('⏸️ 暫停播放')
  } else {
    console.log('⚠️ 無法暫停：尚未播放或已暫停')
  }
}

const resumeSpeech = () => {
  if (speechSynthesis.paused) {
    speechSynthesis.resume()
    console.log('▶️ 繼續播放')
  } else {
    console.log('⚠️ 無法繼續：未處於暫停狀態')
  }
}


// 評估口說正確率
const evaluateAccuracy = () => {
  const clean = (str) => str.toLowerCase().replace(/[.,]/g, '')
  const originalWords = clean(originalText.value).split(/\s+/)
  const spokenWords = clean(spokenText.value).split(/\s+/)

  let correct = 0
  const highlighted = originalWords.map((word, i) => {
    if (spokenWords[i] === word) {
      correct++
      return word
    } else {
      return `<span style='color:red'>${word}</span>`
    }
  })

  accuracy.value = Math.round((correct / originalWords.length) * 100)
  highlightedText.value = highlighted.join(' ')
}

// 開始錄音
const startRecording = () => {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!SpeechRecognition) {
    alert('❌ 不支援 Web Speech API，請使用 Chrome 瀏覽器。')
    return
  }

  transcript.value = ''
  spokenText.value = ''
  finalTranscript = ''
  isRecording.value = true
  timer.value = 0
  intervalId = setInterval(() => timer.value++, 1000)

  recognition = new SpeechRecognition()
  recognition.lang = 'en-US'
  recognition.continuous = true
  recognition.interimResults = true

  recognition.onstart = () => console.log('🎤 開始錄音')
  recognition.onerror = (e) => console.error('❌ 錯誤：', e.error)

  recognition.onresult = (event) => {
    let interimTranscript = ''
    for (let i = event.resultIndex; i < event.results.length; i++) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' '
      } else {
        interimTranscript += event.results[i][0].transcript
      }
    }

    transcript.value = finalTranscript + interimTranscript
    spokenText.value = transcript.value.toLowerCase()
    evaluateAccuracy()
  }

  recognition.onend = () => {
    console.log('🛑 錄音結束')
    stopRecording()
  }

  recognition.start()
}

// 停止錄音
const stopRecording = () => {
  if (!isRecording.value) return

  isRecording.value = false
  clearInterval(intervalId)

  try {
    recognition.stop()
  } catch (e) {
    console.warn('🎤 停止錄音錯誤:', e)
  }

  if (!transcript.value && spokenText.value) {
    transcript.value = spokenText.value
    evaluateAccuracy()
  }

  setTimeout(() => {
    if (!transcript.value) {
      alert('❗ 沒有偵測到語音，請確認麥克風正常並再試一次。')
    }
  }, 500)
}

const loadRandomArticle = () => {
  if (articles.value.length === 0) return

  const randomIndex = Math.floor(Math.random() * articles.value.length)
  const newArticle = articles.value[randomIndex]?.content?.trim()

  if (newArticle) {
    originalText.value = newArticle
    highlightedText.value = newArticle
    transcript.value = ''
    spokenText.value = ''
    accuracy.value = 0
  } else {
    originalText.value = '⚠️ 無法載入新文章'
    highlightedText.value = originalText.value
  }

  // 停止任何正在播放的語音
  speechSynthesis.cancel()
}


</script>

<style>
.btn {
  background-color: #299e5e;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.5rem;
  transition: background-color 0.3s;
  cursor: pointer;
  user-select: none;
}
.btn:hover:not(:disabled) {
  background-color: #247d4e;
}
.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn + .btn {
  margin-left: 0.5rem;
}
</style>
