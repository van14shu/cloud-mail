<template>
  <div class="temp-mail-page">
    <!-- 移动端：打开历史列表 -->
    <div class="mobile-history-toggle" @click="historyDrawer = true">
      <Icon icon="solar:history-bold-duotone" width="18" height="18"/>
      <span>{{ $t('historyMailbox') }}</span>
      <span class="count-tag">{{ accounts.length }}</span>
    </div>

    <div class="temp-mail-body">
      <!-- 左侧历史邮箱 -->
      <aside class="history-panel desktop-history">
        <div class="history-header">
          <div class="history-title">
            <Icon icon="solar:history-bold-duotone" width="20" height="20"/>
            <span>{{ $t('historyMailbox') }}</span>
          </div>
          <span class="history-count">{{ accounts.length }} {{ $t('mailboxUnit') }}</span>
        </div>

        <el-scrollbar class="history-scroll" ref="historyScrollRef">
          <div
              v-infinite-scroll="loadAccounts"
              :infinite-scroll-distance="200"
              :infinite-scroll-immediate="false"
              :infinite-scroll-disabled="accountLoading || accountFollowLoading || accountNoMore"
          >
            <div
                v-for="item in accounts"
                :key="item.accountId"
                class="history-item"
                :class="{ active: currentAccount?.accountId === item.accountId }"
                @click="selectAccount(item)"
            >
              <div class="history-email" :title="item.email">{{ item.email }}</div>
              <div class="history-time">{{ formatAccountTime(item.createTime) }}</div>
            </div>

            <template v-if="accountLoading">
              <el-skeleton v-for="i in 6" :key="'sk-' + i" animated class="history-skeleton">
                <template #template>
                  <el-skeleton-item variant="p" style="width: 80%; height: 16px; margin-bottom: 8px"/>
                  <el-skeleton-item variant="text" style="width: 50%; height: 12px"/>
                </template>
              </el-skeleton>
            </template>

            <div v-if="accountNoMore && accounts.length > 0" class="history-end">{{ $t('noMoreData') }}</div>
            <el-empty v-if="accountNoMore && accounts.length === 0" :description="$t('noMailboxYet')"/>
          </div>
        </el-scrollbar>
      </aside>

      <!-- 右侧主区域 -->
      <section class="main-panel">
        <!-- 生成区 -->
        <div class="generate-card">
          <div class="card-title">
            <Icon icon="solar:magic-stick-3-bold-duotone" width="22" height="22" color="#7c5cff"/>
            <span>{{ $t('generateTempMail') }}</span>
          </div>

          <div class="generate-grid">
            <div class="current-box">
              <div class="section-label">
                <Icon icon="mdi:email-outline" width="16" height="16"/>
                <span>{{ $t('currentMailbox') }}</span>
              </div>
              <div class="current-email-display" :title="currentEmail">
                {{ currentEmail || $t('noCurrentMailbox') }}
              </div>
              <div class="action-row">
                <el-button class="copy-btn" @click="copyCurrentEmail" :disabled="!currentEmail">
                  <Icon icon="solar:copy-bold-duotone" width="16" height="16" style="margin-right: 6px"/>
                  {{ $t('copyMailbox') }}
                </el-button>
                <el-button type="primary" class="refresh-btn" @click="refreshEmails" :loading="emailRefreshing" :disabled="!currentAccount?.accountId">
                  <Icon icon="ion:reload" width="16" height="16" style="margin-right: 6px"/>
                  {{ $t('refreshMail') }}
                </el-button>
              </div>
            </div>

            <div class="config-box">
              <div class="section-label">
                <Icon icon="solar:settings-bold-duotone" width="16" height="16"/>
                <span>{{ $t('mailboxConfig') }}</span>
              </div>

              <div class="config-field">
                <div class="field-label">
                  <Icon icon="mdi:web" width="14" height="14"/>
                  <span>{{ $t('emailSuffix') }}</span>
                </div>
                <el-select v-model="selectedSuffix" class="suffix-select" :placeholder="$t('select')">
                  <el-option v-for="item in domainList" :key="item" :label="item" :value="item"/>
                </el-select>
              </div>

              <div class="config-field">
                <div class="field-label">
                  <Icon icon="mdi:ruler" width="14" height="14"/>
                  <span>{{ $t('usernameLength') }}</span>
                  <span class="length-badge">{{ usernameLength }} {{ $t('character') || '位' }}</span>
                </div>
                <el-slider v-model="usernameLength" :min="minLength" :max="16" :step="1" :show-tooltip="false"/>
              </div>

              <template v-if="!isCustomMode">
                <div class="gen-btn-row">
                  <el-button class="random-btn" :loading="generating === 'random'" :disabled="!canGenerate" @click="generateAndAdd('random')">
                    <Icon icon="mdi:dice-5-outline" width="16" height="16" style="margin-right: 6px"/>
                    {{ $t('randomGenerate') }}
                  </el-button>
                  <el-button type="primary" class="name-btn" :loading="generating === 'name'" :disabled="!canGenerate" @click="generateAndAdd('name')">
                    <Icon icon="mdi:account-outline" width="16" height="16" style="margin-right: 6px"/>
                    {{ $t('randomName') }}
                  </el-button>
                </div>
                <el-button class="switch-mode-btn" text @click="isCustomMode = true">
                  {{ $t('switchCustom') }}
                </el-button>
              </template>

              <template v-else>
                <div class="custom-row">
                  <el-input
                      v-model="customPrefix"
                      :placeholder="$t('emailAccount')"
                      clearable
                      @keyup.enter="generateAndAdd('custom')"
                  >
                    <template #append>
                      <span class="custom-suffix">{{ selectedSuffix }}</span>
                    </template>
                  </el-input>
                </div>
                <div class="gen-btn-row">
                  <el-button type="primary" :loading="generating === 'custom'" :disabled="!canGenerate" @click="generateAndAdd('custom')">
                    {{ $t('add') }}
                  </el-button>
                  <el-button @click="isCustomMode = false">{{ $t('switchRandom') }}</el-button>
                </div>
              </template>

              <div
                  class="add-email-turnstile"
                  :class="verifyShow ? 'turnstile-show' : 'turnstile-hide'"
                  :data-sitekey="settingStore.settings.siteKey"
                  data-callback="onTempMailTurnstileSuccess"
                  data-error-callback="onTempMailTurnstileError"
              >
                <span style="font-size: 12px;color: #F56C6C" v-if="botJsError">{{ $t('verifyModuleFailed') }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 收件箱 -->
        <div class="inbox-card">
          <div class="inbox-header">
            <div class="card-title">
              <Icon icon="solar:inbox-bold-duotone" width="22" height="22" color="#409eff"/>
              <span>{{ $t('inbox') }}</span>
            </div>
            <div class="refresh-countdown" v-if="autoRefreshEnabled && currentAccount?.accountId">
              <Icon icon="mdi:timer-outline" width="16" height="16"/>
              <span>{{ $t('refreshIn', { sec: countdown }) }}</span>
            </div>
          </div>

          <div class="inbox-list" v-loading="emailLoading">
            <div
                v-for="item in emails"
                :key="item.emailId"
                class="email-item"
                :class="{ unread: item.unread === 0 }"
                @click="openEmail(item)"
            >
              <div class="email-meta">
                <div class="email-row">
                  <span class="meta-label">{{ $t('sender') }}</span>
                  <span class="meta-value sender">{{ item.name || item.sendEmail || '-' }}</span>
                  <span class="email-time">{{ item.formatCreateTime }}</span>
                </div>
                <div class="email-row">
                  <span class="meta-label">{{ $t('subject') }}</span>
                  <span class="meta-value subject">
                    <span v-if="item.code" class="code-tag">[{{ $t('codeLabel') }}{{ item.code }}]</span>
                    {{ item.subject || '​' }}
                  </span>
                </div>
                <div class="email-row content-row">
                  <span class="meta-label">{{ $t('content') }}</span>
                  <span class="meta-value content">{{ item.formatText || item.text || '​' }}</span>
                </div>
              </div>
            </div>

            <el-empty v-if="!emailLoading && emails.length === 0" :description="$t('noMessagesFound')"/>

            <div v-if="!emailNoMore && emails.length > 0" class="load-more">
              <el-button text :loading="emailFollowLoading" @click="loadEmails">{{ $t('loadMore') }}</el-button>
            </div>
          </div>
        </div>
      </section>
    </div>

    <!-- 移动端历史抽屉 -->
    <el-drawer v-model="historyDrawer" direction="ltr" size="280px" :with-header="false" class="history-drawer">
      <div class="history-panel drawer-history">
        <div class="history-header">
          <div class="history-title">
            <Icon icon="solar:history-bold-duotone" width="20" height="20"/>
            <span>{{ $t('historyMailbox') }}</span>
          </div>
          <span class="history-count">{{ accounts.length }} {{ $t('mailboxUnit') }}</span>
        </div>
        <el-scrollbar class="history-scroll">
          <div
              v-for="item in accounts"
              :key="'m-' + item.accountId"
              class="history-item"
              :class="{ active: currentAccount?.accountId === item.accountId }"
              @click="selectAccount(item); historyDrawer = false"
          >
            <div class="history-email" :title="item.email">{{ item.email }}</div>
            <div class="history-time">{{ formatAccountTime(item.createTime) }}</div>
          </div>
        </el-scrollbar>
      </div>
    </el-drawer>
  </div>
</template>

<script setup>
import {Icon} from '@iconify/vue'
import {computed, nextTick, onActivated, onDeactivated, onMounted, onBeforeUnmount, reactive, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRoute, useRouter} from 'vue-router'
import {accountAdd, accountList} from '@/request/account.js'
import {emailList, emailLatest, emailRead} from '@/request/email.js'
import {useSettingStore} from '@/store/setting.js'
import {useAccountStore} from '@/store/account.js'
import {useEmailStore} from '@/store/email.js'
import {useUserStore} from '@/store/user.js'
import {hasPerm} from '@/perm/perm.js'
import {isEmail} from '@/utils/verify-utils.js'
import {generateNameLocalPart, generateRandomLocalPart} from '@/utils/email-gen.js'
import {fromNow, tzDayjs} from '@/utils/day.js'
import {sleep} from '@/utils/time-utils.js'

defineOptions({name: 'temp-mail'})

const {t} = useI18n()
const route = useRoute()
const router = useRouter()
const settingStore = useSettingStore()
const accountStore = useAccountStore()
const emailStore = useEmailStore()
const userStore = useUserStore()

const domainList = computed(() => settingStore.domainList || [])
const minLength = computed(() => {
  const min = Number(settingStore.settings.minEmailPrefix) || 1
  return Math.max(min, 4)
})

const accounts = reactive([])
const currentAccount = ref(null)
const accountLoading = ref(false)
const accountFollowLoading = ref(false)
const accountNoMore = ref(false)
const historyScrollRef = ref(null)
const historyDrawer = ref(false)

const selectedSuffix = ref('')
const usernameLength = ref(8)
const isCustomMode = ref(false)
const customPrefix = ref('')
const generating = ref('')
const verifyShow = ref(false)
const botJsError = ref(false)
let verifyToken = ''
let turnstileId = null
let verifyErrorCount = 0
let pendingGenerateType = null

const emails = reactive([])
const emailLoading = ref(false)
const emailFollowLoading = ref(false)
const emailRefreshing = ref(false)
const emailNoMore = ref(false)
const countdown = ref(0)
let countdownTimer = null
let latestPollTimer = null
let latestEmailId = 0
const existEmailIds = new Set()
let pageActive = true

const currentEmail = computed(() => currentAccount.value?.email || '')
const autoRefreshEnabled = computed(() => Number(settingStore.settings.autoRefresh) > 1)
const canGenerate = computed(() => {
  return hasPerm('account:add')
      && settingStore.settings.addEmail === 0
      && settingStore.settings.manyEmail === 0
      && !!selectedSuffix.value
      && !generating.value
})

watch(domainList, (list) => {
  if (!selectedSuffix.value && list.length > 0) {
    selectedSuffix.value = list[0]
  }
}, {immediate: true})

watch(minLength, (val) => {
  if (usernameLength.value < val) {
    usernameLength.value = val
  }
}, {immediate: true})

function formatAccountTime(time) {
  if (!time) return ''
  return tzDayjs(time).format('YYYY/M/D HH:mm:ss')
}

function syncAccountStore(account) {
  if (!account) return
  accountStore.currentAccountId = account.accountId
  accountStore.currentAccount = account
}

function selectAccount(account) {
  if (!account) return
  const isSame = currentAccount.value?.accountId === account.accountId
  currentAccount.value = account
  syncAccountStore(account)
  // 账号变化时由 watch 触发 loadEmails；手动刷新走 refreshEmails
  if (isSame) return
}

async function loadAccounts() {
  if (accountLoading.value || accountFollowLoading.value || accountNoMore.value) return
  if (!hasPerm('account:query')) {
    accountNoMore.value = true
    return
  }

  if (accounts.length === 0) {
    accountLoading.value = true
  } else {
    accountFollowLoading.value = true
  }

  const accountId = accounts.length > 0 ? accounts.at(-1).accountId : 0
  const lastSort = accounts.length > 0 ? accounts.at(-1).sort : null
  const size = 30

  try {
    const list = await accountList(accountId, size, lastSort)
    if (list.length < size) {
      accountNoMore.value = true
    }
    if (accounts.length === 0 && list.length > 0) {
      selectAccount(list[0])
    }
    accounts.push(...list)
  } finally {
    accountLoading.value = false
    accountFollowLoading.value = false
  }
}

function prependAccount(account) {
  const existsIndex = accounts.findIndex(item => item.accountId === account.accountId)
  if (existsIndex >= 0) {
    accounts.splice(existsIndex, 1)
  }
  accounts.unshift(account)
  selectAccount(account)
}

async function copyCurrentEmail() {
  if (!currentEmail.value) return
  try {
    await navigator.clipboard.writeText(currentEmail.value)
    ElMessage({message: t('copySuccessMsg'), type: 'success', plain: true})
  } catch (e) {
    console.error(e)
    ElMessage({message: t('copyFailMsg'), type: 'error', plain: true})
  }
}

function buildLocalPart(type) {
  if (type === 'custom') {
    return (customPrefix.value || '').trim()
  }
  if (type === 'name') {
    return generateNameLocalPart(usernameLength.value)
  }
  return generateRandomLocalPart(usernameLength.value)
}

function ensureTurnstile() {
  const settings = settingStore.settings
  const needAlways = settings.addEmailVerify === 0
  const needByCount = settings.addEmailVerify === 2 && settings.addVerifyOpen
  if (!needAlways && !needByCount) {
    return true
  }

  if (verifyToken) {
    return true
  }

  if (!verifyShow.value) {
    verifyShow.value = true
    nextTick(() => {
      try {
        if (!turnstileId) {
          turnstileId = window.turnstile.render('.add-email-turnstile')
        } else {
          window.turnstile.reset(turnstileId)
        }
      } catch (e) {
        botJsError.value = true
        console.warn('人机验证js加载失败', e)
      }
    })
  } else if (!botJsError.value) {
    ElMessage({message: t('botVerifyMsg'), type: 'error', plain: true})
  }
  return false
}

function resetTurnstile() {
  verifyToken = ''
  if (turnstileId && window.turnstile) {
    window.turnstile.reset(turnstileId)
  }
  verifyShow.value = true
}

async function generateAndAdd(type, retryCount = 0) {
  if (!hasPerm('account:add') || settingStore.settings.addEmail !== 0 || settingStore.settings.manyEmail !== 0) {
    ElMessage({message: t('addAccountDisabled'), type: 'error', plain: true})
    return
  }

  if (generating.value && retryCount === 0) {
    return
  }

  if (!selectedSuffix.value) {
    ElMessage({message: t('selectDomainFirst'), type: 'error', plain: true})
    return
  }

  const localPart = buildLocalPart(type)
  if (!localPart) {
    ElMessage({message: t('emptyEmailMsg'), type: 'error', plain: true})
    return
  }

  if (localPart.length < (settingStore.settings.minEmailPrefix || 1)) {
    ElMessage({
      message: t('minEmailPrefix', {msg: settingStore.settings.minEmailPrefix}),
      type: 'error',
      plain: true
    })
    return
  }

  const fullEmail = localPart + selectedSuffix.value
  if (!isEmail(fullEmail)) {
    ElMessage({message: t('notEmailMsg'), type: 'error', plain: true})
    return
  }

  pendingGenerateType = type
  if (!ensureTurnstile()) {
    return
  }

  generating.value = type
  try {
    const account = await accountAdd(fullEmail, verifyToken)
    verifyToken = ''
    verifyShow.value = false
    if (account.addVerifyOpen !== undefined) {
      settingStore.settings.addVerifyOpen = account.addVerifyOpen
    }
    prependAccount(account)
    if (type === 'custom') {
      customPrefix.value = ''
    }
    ElMessage({message: t('addSuccessMsg'), type: 'success', plain: true})
    userStore.refreshUserInfo?.()
  } catch (res) {
    if (res?.code === 400) {
      resetTurnstile()
    }
    // 邮箱已占用时，随机模式自动重试
    const msg = res?.message || ''
    const isConflict = res?.code === 409 || /exist|已|占用|注册|存在/i.test(msg)
    if (isConflict && type !== 'custom' && retryCount < 3) {
      generating.value = ''
      await generateAndAdd(type, retryCount + 1)
      return
    }
  } finally {
    generating.value = ''
    pendingGenerateType = null
  }
}

window.onTempMailTurnstileSuccess = (token) => {
  verifyToken = token
  if (pendingGenerateType) {
    generateAndAdd(pendingGenerateType)
  }
}

window.onTempMailTurnstileError = (e) => {
  if (verifyErrorCount >= 4) return
  verifyErrorCount++
  console.warn('人机验证加载失败', e)
  setTimeout(() => {
    nextTick(() => {
      try {
        if (!turnstileId) {
          turnstileId = window.turnstile.render('.add-email-turnstile')
        } else {
          window.turnstile.reset(turnstileId)
        }
      } catch (err) {
        botJsError.value = true
      }
    })
  }, 1500)
}

function previewText(email) {
  if (email.content) {
    const tempDiv = document.createElement('div')
    tempDiv.innerHTML = email.content.replace(
        /<(img|iframe|object|embed|video|audio|source|link|script|style)[^>]*>/gi, ''
    )
    tempDiv.querySelectorAll('script, style, title').forEach(el => el.remove())
    return (tempDiv.textContent || '').replace(/\s+/g, ' ').trim()
  }
  return (email.text || '').replace(/\s+/g, ' ').trim()
}

function formatEmailItem(email) {
  return {
    ...email,
    formatCreateTime: fromNow(email.createTime),
    formatText: previewText(email)
  }
}

async function loadEmails(reset = false) {
  if (!currentAccount.value?.accountId) {
    emails.splice(0, emails.length)
    return
  }
  if (emailLoading.value || emailFollowLoading.value) return
  if (!reset && emailNoMore.value) return

  if (reset) {
    emailNoMore.value = false
    emails.splice(0, emails.length)
    existEmailIds.clear()
    latestEmailId = 0
    emailLoading.value = true
  } else {
    emailFollowLoading.value = true
  }

  const accountId = currentAccount.value.accountId
  // 临时邮箱页始终只看当前地址，不混入「全部收取」
  const allReceive = 0
  const emailId = reset || emails.length === 0 ? 0 : emails.at(-1).emailId
  const size = 20

  try {
    const data = await emailList(accountId, allReceive, emailId, 0, size, 0)
    const list = (data.list || []).map(formatEmailItem)
    if (list.length < size) {
      emailNoMore.value = true
    }
    for (const item of list) {
      if (!existEmailIds.has(item.emailId)) {
        existEmailIds.add(item.emailId)
        emails.push(item)
      }
    }
    if (data.latestEmail?.emailId) {
      latestEmailId = data.latestEmail.emailId
    } else if (emails.length > 0) {
      latestEmailId = emails[0].emailId
    }
  } finally {
    emailLoading.value = false
    emailFollowLoading.value = false
    emailRefreshing.value = false
  }
}

async function refreshEmails() {
  if (!currentAccount.value?.accountId) return
  emailRefreshing.value = true
  await loadEmails(true)
  resetCountdown()
}

function openEmail(email) {
  if (email.unread === 0) {
    email.unread = 1
    emailRead([email.emailId]).catch(() => {
      email.unread = 0
    })
  }
  emailStore.contentData.email = email
  emailStore.contentData.delType = 'logic'
  emailStore.contentData.showUnread = true
  emailStore.contentData.showStar = true
  emailStore.contentData.showReply = true
  router.push('/message')
}

function resetCountdown() {
  const sec = Number(settingStore.settings.autoRefresh)
  countdown.value = sec > 1 ? sec : 0
}

function stopTimers() {
  if (countdownTimer) {
    clearInterval(countdownTimer)
    countdownTimer = null
  }
  if (latestPollTimer) {
    clearTimeout(latestPollTimer)
    latestPollTimer = null
  }
}

function startAutoRefresh() {
  stopTimers()
  if (!autoRefreshEnabled.value) return

  resetCountdown()
  countdownTimer = setInterval(() => {
    if (!pageActive || route.name !== 'temp-mail') return
    if (countdown.value > 0) {
      countdown.value -= 1
    }
  }, 1000)

  const loop = async () => {
    const interval = Number(settingStore.settings.autoRefresh)
    const waitMs = interval > 1 ? interval * 1000 : 3000
    await sleep(waitMs)

    if (!pageActive) {
      latestPollTimer = setTimeout(loop, 0)
      return
    }
    if (route.name !== 'temp-mail') {
      latestPollTimer = setTimeout(loop, 0)
      return
    }

    try {
      if (autoRefreshEnabled.value && currentAccount.value?.accountId && latestEmailId) {
        const accountId = currentAccount.value.accountId
        const allReceive = 0
        const list = await emailLatest(latestEmailId, accountId, allReceive)
        if (accountId === currentAccount.value?.accountId && Array.isArray(list) && list.length > 0) {
          for (const raw of list) {
            if (!existEmailIds.has(raw.emailId)) {
              existEmailIds.add(raw.emailId)
              emails.unshift(formatEmailItem(raw))
              latestEmailId = Math.max(latestEmailId, raw.emailId)
              await sleep(30)
            }
          }
        }
      }
    } catch (e) {
      if (e?.code === 401 || e?.code === 403) {
        settingStore.settings.autoRefresh = 0
      }
      console.error(e)
    }

    resetCountdown()
    latestPollTimer = setTimeout(loop, 0)
  }

  latestPollTimer = setTimeout(loop, 0)
}

watch(() => currentAccount.value?.accountId, () => {
  loadEmails(true)
})

onMounted(() => {
  pageActive = true
  if (usernameLength.value < minLength.value) {
    usernameLength.value = minLength.value
  }
  loadAccounts()
  startAutoRefresh()
})

onActivated(() => {
  pageActive = true
  startAutoRefresh()
})

onDeactivated(() => {
  pageActive = false
  stopTimers()
})

onBeforeUnmount(() => {
  pageActive = false
  stopTimers()
  delete window.onTempMailTurnstileSuccess
  delete window.onTempMailTurnstileError
})
</script>

<style scoped lang="scss">
.temp-mail-page {
  height: 100%;
  overflow: hidden;
  background: var(--el-bg-color-page, var(--el-bg-color));
  display: flex;
  flex-direction: column;
}

.mobile-history-toggle {
  display: none;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;

  .count-tag {
    margin-left: auto;
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    border-radius: 999px;
    padding: 2px 8px;
    font-size: 12px;
  }

  @media (max-width: 900px) {
    display: flex;
  }
}

.temp-mail-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 14px;
  padding: 14px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    padding: 10px;
  }
}

.desktop-history {
  @media (max-width: 900px) {
    display: none;
  }
}

.history-panel {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
}

.drawer-history {
  height: 100%;
  border: none;
  border-radius: 0;
  box-shadow: none;
}

.history-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 14px 10px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.history-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 15px;
}

.history-count {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-radius: 999px;
  padding: 2px 8px;
}

.history-scroll {
  flex: 1;
  min-height: 0;
  padding: 8px;
}

.history-item {
  padding: 12px;
  border-radius: 10px;
  cursor: pointer;
  margin-bottom: 6px;
  transition: background 0.15s ease;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.active {
    background: var(--el-color-primary-light-9);
    box-shadow: inset 0 0 0 1px var(--el-color-primary-light-5);
  }
}

.history-email {
  font-weight: 600;
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-time {
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.history-skeleton {
  padding: 12px;
}

.history-end {
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  padding: 10px 0 16px;
}

.main-panel {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 14px;
  overflow: auto;
}

.generate-card,
.inbox-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  padding: 16px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.04);
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 14px;
}

.generate-grid {
  display: grid;
  grid-template-columns: 1.1fr 1fr;
  gap: 16px;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
  }
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  margin-bottom: 10px;
}

.current-email-display {
  border: 1px solid var(--el-color-primary-light-5);
  background: linear-gradient(180deg, var(--el-color-primary-light-9), var(--el-bg-color));
  border-radius: 12px;
  padding: 18px 14px;
  text-align: center;
  font-size: 18px;
  font-weight: 700;
  color: var(--el-color-primary);
  word-break: break-all;
  min-height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 12px;

  .el-button {
    width: 100%;
    margin: 0;
  }
}

.copy-btn {
  border-color: var(--el-color-primary-light-5);
}

.config-field {
  margin-bottom: 14px;
}

.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.length-badge {
  margin-left: auto;
  background: var(--el-fill-color);
  border-radius: 8px;
  padding: 2px 8px;
  color: var(--el-text-color-regular);
}

.suffix-select {
  width: 100%;
}

.gen-btn-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 4px;

  .el-button {
    width: 100%;
    margin: 0;
  }
}

.switch-mode-btn {
  width: 100%;
  margin-top: 10px;
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
}

.custom-row {
  margin-bottom: 10px;

  :deep(.el-input-group__append) {
    max-width: 45%;
    overflow: hidden;
    text-overflow: ellipsis;
    background: var(--el-fill-color-light);
  }
}

.custom-suffix {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.inbox-card {
  flex: 1;
  min-height: 280px;
  display: flex;
  flex-direction: column;
}

.inbox-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;

  .card-title {
    margin-bottom: 0;
  }
}

.refresh-countdown {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-radius: 999px;
  padding: 4px 10px;
}

.inbox-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
}

.email-item {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 2px 10px rgba(64, 158, 255, 0.08);
  }

  &.unread {
    background: var(--el-color-primary-light-9);
  }
}

.email-row {
  display: grid;
  grid-template-columns: 48px 1fr auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;

  &:last-child {
    margin-bottom: 0;
  }
}

.content-row {
  grid-template-columns: 48px 1fr;
}

.meta-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.meta-value {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}

.sender {
  font-weight: 600;
}

.subject {
  font-weight: 600;
}

.content {
  color: var(--el-text-color-secondary);
}

.email-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.code-tag {
  color: var(--el-color-danger);
  margin-right: 4px;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 8px 0 4px;
}

.add-email-turnstile {
  margin-top: 12px;
}

.turnstile-show {
  opacity: 1;
}

.turnstile-hide {
  opacity: 0;
  pointer-events: none;
  position: fixed;
}
</style>
