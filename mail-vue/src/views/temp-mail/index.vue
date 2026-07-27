<template>
  <div class="temp-mail-page">
    <div class="mobile-history-toggle" @click="historyDrawer = true">
      <Icon icon="solar:history-bold-duotone" width="18" height="18"/>
      <span>{{ $t('historyMailbox') }}</span>
      <span class="count-tag">{{ accountTotal }}</span>
    </div>

    <div class="temp-mail-body">
      <!-- 左侧历史邮箱（分页） -->
      <aside class="history-panel desktop-history">
        <div class="history-header">
          <div class="history-title">
            <Icon icon="solar:history-bold-duotone" width="20" height="20"/>
            <span>{{ $t('historyMailbox') }}</span>
          </div>
          <span class="history-count">{{ accountTotal }} {{ $t('mailboxUnit') }}</span>
        </div>

        <div class="history-list" v-loading="accountLoading">
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
          <el-empty v-if="!accountLoading && accounts.length === 0" :description="$t('noMailboxYet')"/>
        </div>

        <div class="history-pagination" v-if="accountTotal > pageSize">
          <button
              class="page-nav"
              type="button"
              :disabled="historyPage <= 1 || accountLoading"
              aria-label="Previous page"
              @click="loadAccounts(historyPage - 1)"
          >
            <Icon icon="mdi:chevron-left" width="18" height="18"/>
          </button>
          <span class="page-indicator" aria-live="polite">
            <em>{{ historyPage }}</em>
            <span class="page-sep">/</span>
            <span>{{ historyTotalPages }}</span>
          </span>
          <button
              class="page-nav"
              type="button"
              :disabled="historyPage >= historyTotalPages || accountLoading"
              aria-label="Next page"
              @click="loadAccounts(historyPage + 1)"
          >
            <Icon icon="mdi:chevron-right" width="18" height="18"/>
          </button>
        </div>
      </aside>

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
                <button class="pill-btn outline" type="button" :disabled="!currentEmail" @click="copyCurrentEmail">
                  <Icon icon="solar:copy-bold-duotone" width="18" height="18"/>
                  <span>{{ $t('copyMailbox') }}</span>
                </button>
                <button class="pill-btn primary" type="button" :disabled="!currentAccount?.accountId || emailRefreshing" @click="refreshEmails">
                  <Icon icon="ion:reload" width="18" height="18" :class="{ spinning: emailRefreshing }"/>
                  <span>{{ $t('refreshMail') }}</span>
                </button>
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
                <el-select v-model="selectedSuffix" class="suffix-select" size="large" :placeholder="$t('select')">
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
                  <button class="pill-btn outline" type="button" :disabled="!canGenerate || !!generating" @click="generateAndAdd('random')">
                    <Icon v-if="generating === 'random'" icon="line-md:loading-twotone-loop" width="18" height="18"/>
                    <Icon v-else icon="mdi:dice-5-outline" width="18" height="18"/>
                    <span>{{ $t('randomGenerate') }}</span>
                  </button>
                  <button class="pill-btn primary" type="button" :disabled="!canGenerate || !!generating" @click="generateAndAdd('name')">
                    <Icon v-if="generating === 'name'" icon="line-md:loading-twotone-loop" width="18" height="18"/>
                    <Icon v-else icon="mdi:account-outline" width="18" height="18"/>
                    <span>{{ $t('randomName') }}</span>
                  </button>
                </div>
                <button class="pill-btn ghost" type="button" @click="isCustomMode = true">
                  {{ $t('switchCustom') }}
                </button>
              </template>

              <template v-else>
                <div class="custom-row">
                  <el-input
                      v-model="customPrefix"
                      size="large"
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
                  <button class="pill-btn primary" type="button" :disabled="!canGenerate || !!generating" @click="generateAndAdd('custom')">
                    <Icon v-if="generating === 'custom'" icon="line-md:loading-twotone-loop" width="18" height="18"/>
                    <span>{{ $t('add') }}</span>
                  </button>
                  <button class="pill-btn outline" type="button" @click="isCustomMode = false">
                    {{ $t('switchRandom') }}
                  </button>
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
    <el-drawer v-model="historyDrawer" direction="ltr" size="300px" :with-header="false">
      <div class="history-panel drawer-history">
        <div class="history-header">
          <div class="history-title">
            <Icon icon="solar:history-bold-duotone" width="20" height="20"/>
            <span>{{ $t('historyMailbox') }}</span>
          </div>
          <span class="history-count">{{ accountTotal }} {{ $t('mailboxUnit') }}</span>
        </div>
        <div class="history-list" v-loading="accountLoading">
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
        </div>
        <div class="history-pagination" v-if="accountTotal > pageSize">
          <button
              class="page-nav"
              type="button"
              :disabled="historyPage <= 1 || accountLoading"
              aria-label="Previous page"
              @click="loadAccounts(historyPage - 1)"
          >
            <Icon icon="mdi:chevron-left" width="18" height="18"/>
          </button>
          <span class="page-indicator" aria-live="polite">
            <em>{{ historyPage }}</em>
            <span class="page-sep">/</span>
            <span>{{ historyTotalPages }}</span>
          </span>
          <button
              class="page-nav"
              type="button"
              :disabled="historyPage >= historyTotalPages || accountLoading"
              aria-label="Next page"
              @click="loadAccounts(historyPage + 1)"
          >
            <Icon icon="mdi:chevron-right" width="18" height="18"/>
          </button>
        </div>
      </div>
    </el-drawer>

    <!-- 邮件详情浮层 -->
    <el-dialog
        v-model="detailVisible"
        class="email-detail-dialog"
        width="min(860px, 94vw)"
        top="6vh"
        append-to-body
        destroy-on-close
        :show-close="false"
        :close-on-click-modal="true"
    >
      <template #header>
        <div class="detail-header">
          <div class="detail-title">
            <Icon icon="fluent-color:mail-16" width="20" height="20"/>
            <span :title="detailEmail?.subject">{{ detailEmail?.subject || $t('emailDetail') }}</span>
          </div>
          <button class="detail-close" type="button" @click="detailVisible = false" aria-label="close">
            <Icon icon="mdi:close" width="22" height="22"/>
          </button>
        </div>
      </template>

      <div class="detail-body" v-if="detailEmail">
        <div v-if="detailEmail.code" class="code-banner" @click="copyText(detailEmail.code)">
          <Icon icon="mdi:key-variant" width="18" height="18" color="#e6a23c"/>
          <span class="code-value">{{ detailEmail.code }}</span>
          <span class="code-tip">{{ $t('clickToCopy') }}</span>
        </div>

        <div class="detail-meta">
          <div><span class="meta-k">{{ $t('sender') }}</span>{{ detailEmail.name || detailEmail.sendEmail }}</div>
          <div><span class="meta-k">{{ $t('subject') }}</span>{{ detailEmail.subject || '-' }}</div>
          <div><span class="meta-k">{{ $t('date') }}</span>{{ formatDetailDate(detailEmail.createTime) }}</div>
        </div>

        <el-scrollbar class="detail-content-scroll">
          <ShadowHtml v-if="detailEmail.content" class="detail-html" :html="formatImage(detailEmail.content)"/>
          <pre v-else class="detail-text">{{ detailEmail.text || '' }}</pre>
        </el-scrollbar>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {Icon} from '@iconify/vue'
import {computed, nextTick, onActivated, onDeactivated, onMounted, onBeforeUnmount, reactive, ref, watch} from 'vue'
import {useI18n} from 'vue-i18n'
import {useRoute} from 'vue-router'
import {accountAdd, accountList, accountListByPage} from '@/request/account.js'
import {emailList, emailLatest, emailRead} from '@/request/email.js'
import {useSettingStore} from '@/store/setting.js'
import {useAccountStore} from '@/store/account.js'
import {useUserStore} from '@/store/user.js'
import {hasPerm} from '@/perm/perm.js'
import {isEmail} from '@/utils/verify-utils.js'
import {generateNameLocalPart, generateRandomLocalPart} from '@/utils/email-gen.js'
import {formatDetailDate, fromNow, tzDayjs} from '@/utils/day.js'
import {sleep} from '@/utils/time-utils.js'
import {toOssDomain} from '@/utils/convert.js'
import ShadowHtml from '@/components/shadow-html/index.vue'

defineOptions({name: 'temp-mail'})

const {t} = useI18n()
const route = useRoute()
const settingStore = useSettingStore()
const accountStore = useAccountStore()
const userStore = useUserStore()

const pageSize = 10
const historyPage = ref(1)
const accountTotal = ref(0)

const domainList = computed(() => settingStore.domainList || [])
const minLength = computed(() => {
  const min = Number(settingStore.settings.minEmailPrefix) || 1
  return Math.max(min, 4)
})

const accounts = reactive([])
const currentAccount = ref(null)
const accountLoading = ref(false)
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

const detailVisible = ref(false)
const detailEmail = ref(null)

const currentEmail = computed(() => currentAccount.value?.email || '')
const historyTotalPages = computed(() => Math.max(1, Math.ceil(accountTotal.value / pageSize)))
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

function formatImage(content) {
  content = content || ''
  const domain = settingStore.settings.r2Domain
  return content.replace(/{{domain}}/g, toOssDomain(domain) + '/')
}

function syncAccountStore(account) {
  if (!account) return
  accountStore.currentAccountId = account.accountId
  accountStore.currentAccount = account
}

function selectAccount(account) {
  if (!account) return
  currentAccount.value = account
  syncAccountStore(account)
}

function normalizeAccountPage(data) {
  if (Array.isArray(data)) {
    return {list: data, total: data.length}
  }
  if (data && Array.isArray(data.list)) {
    return {list: data.list, total: Number(data.total) || data.list.length}
  }
  return {list: [], total: 0}
}

async function loadAccounts(page = historyPage.value) {
  // el-pagination 可能传入数字；兜底非法值
  page = Number(page) || 1
  if (page < 1) page = 1

  if (!hasPerm('account:query')) {
    accounts.splice(0, accounts.length)
    accountTotal.value = 0
    return
  }

  accountLoading.value = true
  historyPage.value = page

  try {
    let {list, total} = normalizeAccountPage(await accountListByPage(page, pageSize))

    // 分页接口异常/旧后端未部署时，回退到已验证可用的游标接口
    if (page === 1 && list.length === 0) {
      const fallback = await accountList(0, pageSize, null)
      if (Array.isArray(fallback) && fallback.length > 0) {
        list = fallback
        // 游标接口无 total：满页则至少还有下一页
        total = fallback.length === pageSize ? pageSize + 1 : fallback.length
      }
    }

    accounts.splice(0, accounts.length, ...list)
    accountTotal.value = total

    if (list.length > 0) {
      const stillSelected = list.find(item => item.accountId === currentAccount.value?.accountId)
      if (stillSelected) {
        selectAccount(stillSelected)
      } else if (!currentAccount.value) {
        // 首次进入无选中时默认第一条
        selectAccount(list[0])
      }
      // 若当前选中不在本页（例如刚生成），保留 currentAccount，由调用方处理
    } else if (page > 1 && total > 0) {
      const lastPage = Math.max(1, Math.ceil(total / pageSize))
      if (lastPage !== page) {
        await loadAccounts(lastPage)
      }
    }
  } catch (e) {
    console.error(e)
    // 分页失败时尝试游标接口，避免整页空白
    if (page === 1) {
      try {
        const fallback = await accountList(0, pageSize, null)
        if (Array.isArray(fallback)) {
          accounts.splice(0, accounts.length, ...fallback)
          accountTotal.value = fallback.length === pageSize ? pageSize + 1 : fallback.length
          if (fallback.length > 0 && !currentAccount.value) {
            selectAccount(fallback[0])
          }
        }
      } catch (err) {
        console.error(err)
      }
    }
  } finally {
    accountLoading.value = false
  }
}

async function prependAccount(account) {
  // 生成成功后立刻展示当前邮箱，不依赖列表刷新结果
  selectAccount(account)

  const existIndex = accounts.findIndex(item => item.accountId === account.accountId)
  if (existIndex >= 0) {
    accounts.splice(existIndex, 1)
  }
  accounts.unshift(account)
  if (historyPage.value !== 1) {
    // 非首页时先切回第一页视觉（本地插入）
    historyPage.value = 1
  }
  // 保证当前页最多 pageSize 条
  if (accounts.length > pageSize) {
    accounts.splice(pageSize)
  }
  accountTotal.value = Math.max(accountTotal.value + 1, accounts.length)

  // 后台对齐服务端分页数据
  try {
    await loadAccounts(1)
    if (!accounts.some(item => item.accountId === account.accountId)) {
      accounts.unshift(account)
      if (accounts.length > pageSize) {
        accounts.splice(pageSize)
      }
      accountTotal.value = Math.max(accountTotal.value, accounts.length)
    }
    selectAccount(account)
  } catch (e) {
    console.error(e)
    selectAccount(account)
  }
}

async function copyText(text) {
  if (!text) return
  try {
    await navigator.clipboard.writeText(text)
    ElMessage({message: t('copySuccessMsg'), type: 'success', plain: true})
  } catch (e) {
    console.error(e)
    ElMessage({message: t('copyFailMsg'), type: 'error', plain: true})
  }
}

async function copyCurrentEmail() {
  await copyText(currentEmail.value)
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
    await prependAccount(account)
    if (type === 'custom') {
      customPrefix.value = ''
    }
    ElMessage({message: t('addSuccessMsg'), type: 'success', plain: true})
    userStore.refreshUserInfo?.()
  } catch (res) {
    if (res?.code === 400) {
      resetTurnstile()
    }
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
  detailEmail.value = email
  detailVisible.value = true
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

    if (!pageActive || route.name !== 'temp-mail') {
      latestPollTimer = setTimeout(loop, 0)
      return
    }

    try {
      if (autoRefreshEnabled.value && currentAccount.value?.accountId && latestEmailId) {
        const accountId = currentAccount.value.accountId
        const list = await emailLatest(latestEmailId, accountId, 0)
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
  loadAccounts(1)
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
  padding: 12px 14px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  background: var(--el-bg-color);
  transition: background-color 0.2s ease;
  touch-action: manipulation;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: -2px;
  }

  .count-tag {
    margin-left: auto;
    background: var(--el-color-primary-light-9);
    color: var(--el-color-primary);
    border-radius: 999px;
    padding: 3px 10px;
    font-size: 12px;
    font-weight: 600;
    line-height: 1.4;
  }

  @media (max-width: 900px) {
    display: flex;
  }
}

.temp-mail-body {
  flex: 1;
  min-height: 0;
  display: grid;
  grid-template-columns: minmax(260px, 300px) 1fr;
  gap: 16px;
  padding: 16px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 12px;
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
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);
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
  gap: 10px;
  padding: 14px 14px 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  flex-shrink: 0;
}

.history-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 700;
  font-size: 15px;
  min-width: 0;
  color: var(--el-text-color-primary);

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.history-count {
  flex-shrink: 0;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-radius: 999px;
  padding: 4px 10px;
  line-height: 1.3;
}

.history-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  padding: 8px;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color) transparent;
}

.history-item {
  position: relative;
  padding: 12px 12px 12px 14px;
  border-radius: 12px;
  cursor: pointer;
  margin-bottom: 4px;
  transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  border: 1px solid transparent;
  touch-action: manipulation;

  &::before {
    content: '';
    position: absolute;
    left: 4px;
    top: 12px;
    bottom: 12px;
    width: 3px;
    border-radius: 999px;
    background: transparent;
    transition: background-color 0.2s ease;
  }

  &:hover {
    background: var(--el-fill-color-light);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 1px;
  }

  &.active {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);

    &::before {
      background: var(--el-color-primary);
    }

    .history-email {
      color: var(--el-color-primary);
    }
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.history-email {
  font-weight: 600;
  font-size: 13px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--el-text-color-primary);
  transition: color 0.2s ease;
}

.history-time {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
  font-variant-numeric: tabular-nums;
}

/* 窄侧栏专用紧凑分页：‹ 1 / 18 ›，单行不换行 */
.history-pagination {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 10px 12px 12px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-bg-color);
}

.page-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-fill-color-blank);
  color: var(--el-text-color-regular);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  touch-action: manipulation;
  flex-shrink: 0;
  padding: 0;

  &:hover:not(:disabled) {
    border-color: var(--el-color-primary-light-5);
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 1px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}

.page-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 72px;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  background: var(--el-fill-color-light);
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--el-text-color-regular);
  line-height: 1;
  user-select: none;

  em {
    font-style: normal;
    color: var(--el-color-primary);
    font-weight: 700;
  }

  .page-sep {
    color: var(--el-text-color-placeholder);
    font-weight: 500;
  }
}

.main-panel {
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color) transparent;

  @media (max-width: 900px) {
    gap: 12px;
  }
}

.generate-card,
.inbox-card {
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 16px;
  padding: 18px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.04);

  @media (max-width: 900px) {
    padding: 14px;
    border-radius: 14px;
  }
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 16px;
  color: var(--el-text-color-primary);
  line-height: 1.3;
}

.generate-grid {
  display: grid;
  grid-template-columns: 1.15fr 1fr;
  gap: 20px;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr;
    gap: 18px;
  }
}

.current-box,
.config-box {
  min-width: 0;
}

.section-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-regular);
  margin-bottom: 12px;
  line-height: 1.3;
}

.current-email-display {
  border: 1.5px solid var(--el-color-primary-light-5);
  background: linear-gradient(165deg, var(--el-color-primary-light-9) 0%, var(--el-bg-color) 100%);
  border-radius: 14px;
  padding: 18px 16px;
  text-align: center;
  font-size: clamp(15px, 2.2vw, 18px);
  font-weight: 700;
  color: var(--el-color-primary);
  word-break: break-all;
  min-height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1.45;
  letter-spacing: 0.01em;
}

.action-row,
.gen-btn-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 14px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}

/* 饱满圆润大按钮 — 触控友好 ≥44px */
.pill-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 46px;
  padding: 0 16px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  border: 1.5px solid transparent;
  transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease, filter 0.2s ease, box-shadow 0.2s ease;
  width: 100%;
  user-select: none;
  background: var(--el-bg-color);
  color: var(--el-text-color-primary);
  touch-action: manipulation;
  line-height: 1.2;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }

  &.primary {
    background: var(--el-color-primary);
    border-color: var(--el-color-primary);
    color: #fff;
    box-shadow: 0 2px 8px color-mix(in srgb, var(--el-color-primary) 28%, transparent);

    &:hover:not(:disabled) {
      filter: brightness(1.06);
    }

    &:active:not(:disabled) {
      filter: brightness(0.96);
    }
  }

  &.outline {
    background: var(--el-bg-color);
    border-color: var(--el-color-primary-light-5);
    color: var(--el-text-color-primary);

    &:hover:not(:disabled) {
      border-color: var(--el-color-primary);
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }
  }

  &.ghost {
    margin-top: 10px;
    min-height: 44px;
    border-style: dashed;
    border-color: var(--el-border-color);
    background: transparent;
    color: var(--el-text-color-regular);

    &:hover:not(:disabled) {
      border-color: var(--el-color-primary-light-3);
      color: var(--el-color-primary);
      background: var(--el-color-primary-light-9);
    }
  }
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.config-field {
  margin-bottom: 16px;

  &:last-of-type {
    margin-bottom: 14px;
  }
}

.field-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 10px;
  line-height: 1.3;
}

.length-badge {
  margin-left: auto;
  background: var(--el-fill-color);
  border-radius: 999px;
  padding: 3px 10px;
  color: var(--el-text-color-regular);
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  line-height: 1.3;
}

.suffix-select {
  width: 100%;

  :deep(.el-select__wrapper) {
    min-height: 44px;
    border-radius: 12px;
  }
}

.custom-row {
  margin-bottom: 12px;

  :deep(.el-input__wrapper) {
    min-height: 44px;
    border-radius: 12px;
  }

  :deep(.el-input-group__append) {
    max-width: 45%;
    overflow: hidden;
    text-overflow: ellipsis;
    background: var(--el-fill-color-light);
    border-radius: 0 12px 12px 0;
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
  gap: 12px;
  margin-bottom: 12px;
  flex-wrap: wrap;

  .card-title {
    margin-bottom: 0;
  }
}

.refresh-countdown {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-radius: 999px;
  padding: 5px 12px;
  line-height: 1.3;
  font-variant-numeric: tabular-nums;
  flex-shrink: 0;
}

.inbox-list {
  flex: 1;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--el-border-color) transparent;
  padding-right: 2px;
}

.email-item {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 14px;
  padding: 14px 16px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease;
  touch-action: manipulation;
  background: var(--el-bg-color);

  &:hover {
    border-color: var(--el-color-primary-light-5);
    box-shadow: 0 4px 14px color-mix(in srgb, var(--el-color-primary) 10%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 1px;
  }

  &.unread {
    background: var(--el-color-primary-light-9);
    border-color: var(--el-color-primary-light-7);

    .sender {
      font-weight: 700;
    }
  }

  &:last-child {
    margin-bottom: 0;
  }
}

.email-row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  gap: 8px;
  align-items: center;
  margin-bottom: 6px;

  &:last-child {
    margin-bottom: 0;
  }
}

.content-row {
  grid-template-columns: 48px minmax(0, 1fr);
}

.meta-label {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  line-height: 1.4;
}

.meta-value {
  font-size: 13px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
  line-height: 1.4;
  color: var(--el-text-color-primary);
}

.sender,
.subject {
  font-weight: 600;
}

.content {
  color: var(--el-text-color-secondary);
  font-weight: 400;
}

.email-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
  line-height: 1.4;
}

.code-tag {
  color: var(--el-color-danger);
  margin-right: 4px;
  font-weight: 700;
}

.load-more {
  display: flex;
  justify-content: center;
  padding: 10px 0 2px;
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

/* 详情浮层 */
.detail-header {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
}

.detail-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
  min-width: 0;
  flex: 1;
  color: var(--el-text-color-primary);

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.detail-close {
  border: none;
  background: transparent;
  cursor: pointer;
  width: 40px;
  height: 40px;
  min-width: 40px;
  min-height: 40px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-regular);
  flex-shrink: 0;
  transition: background-color 0.2s ease, color 0.2s ease;
  touch-action: manipulation;
  padding: 0;

  &:hover {
    background: var(--el-fill-color-light);
    color: var(--el-text-color-primary);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 1px;
  }
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}

.code-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  background: var(--el-color-success-light-9, #e8f5e9);
  color: var(--el-color-success-dark-2, #2e7d32);
  border: 1px solid var(--el-color-success-light-5, #a5d6a7);
  border-radius: 12px;
  padding: 12px 14px;
  cursor: pointer;
  user-select: none;
  transition: filter 0.2s ease, box-shadow 0.2s ease;
  touch-action: manipulation;

  .code-value {
    font-weight: 700;
    font-size: 16px;
    letter-spacing: 0.5px;
    font-variant-numeric: tabular-nums;
  }

  .code-tip {
    margin-left: auto;
    color: var(--el-color-success, #67c23a);
    font-size: 12px;
    font-weight: 500;
  }

  &:hover {
    filter: brightness(0.98);
    box-shadow: 0 2px 8px color-mix(in srgb, var(--el-color-success, #67c23a) 15%, transparent);
  }

  &:focus-visible {
    outline: 2px solid var(--el-color-success);
    outline-offset: 1px;
  }
}

.detail-meta {
  display: grid;
  gap: 8px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 1.5;

  .meta-k {
    display: inline-block;
    width: 56px;
    color: var(--el-text-color-secondary);
    flex-shrink: 0;
  }
}

.detail-content-scroll {
  max-height: min(58vh, 560px);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  padding: 14px;
  background: var(--el-fill-color-blank);
}

.detail-text {
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.65;
  color: var(--el-text-color-primary);
}

.detail-html {
  min-height: 120px;
}

@media (prefers-reduced-motion: reduce) {
  .history-item,
  .page-nav,
  .pill-btn,
  .email-item,
  .detail-close,
  .code-banner,
  .mobile-history-toggle {
    transition: none;
  }

  .spinning {
    animation: none;
  }
}
</style>

<style lang="scss">
/* dialog 挂到 body，需要非 scoped */
.email-detail-dialog.el-dialog {
  border-radius: 16px;
  overflow: hidden;
}

.email-detail-dialog .el-dialog__header {
  margin: 0;
  padding: 14px 16px;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.email-detail-dialog .el-dialog__body {
  padding: 14px 16px 18px;
}
</style>
