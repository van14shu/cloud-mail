/**
 * 从邮件字段解析验证码。
 * 优先使用后端 AI 提取的 code，其次从主题/正文用规则兜底。
 */

const MAX_CODE_LENGTH = 12
const MIN_CODE_LENGTH = 3

/** 带明确标签的验证码模式（优先；捕获段不含空格，避免吞掉后续英文单词） */
const LABELED_CODE_PATTERNS = [
	/(?:confirmation\s*code|verification\s*code|verify(?:ing)?\s*code|security\s*code|one[-\s]?time\s*(?:code|password|pwd|passcode)|otp(?:\s*code)?|auth(?:entication)?\s*code|access\s*code|pin\s*code|pass\s*code|登录码|校验码|动态码|激活码|验证码)\s*[:：=\-–—]?\s*([A-Za-z0-9][A-Za-z0-9\-]{2,14})/i,
	/\b(?:code|码)\s*[:：=\-–—]\s*([A-Za-z0-9][A-Za-z0-9\-]{2,14})\b/i,
	// 空格分隔的数字 OTP：验证码 12 34 56
	/(?:confirmation\s*code|verification\s*code|otp(?:\s*code)?|验证码|校验码|动态码)\s*[:：=\-–—]?\s*(\d{1,4}(?:\s+\d{1,4}){1,5})/i,
]

/**
 * 仅用于主题的兜底模式，避免正文 CSS/HTML 噪声误匹配
 * 必须含数字或连字符，避免把 Welcome 等纯英文词当成验证码
 */
const SUBJECT_FALLBACK_PATTERNS = [
	/\b([A-Z0-9]{2,4}-[A-Z0-9]{2,4})\b/i,
	/\b(\d{4,8})\b/,
	// 字母数字混合（至少含一个数字），长度 6–8
	/\b(?=[A-Z0-9]*\d)([A-Z0-9]{6,8})\b/i,
]

/**
 * 清洗并校验提取到的原始码
 * @param {string} raw
 * @returns {string}
 */
function normalizeCode(raw) {
	if (!raw || typeof raw !== 'string') {
		return ''
	}

	let code = raw.trim()
		.replace(/^["'`[{(<]+/, '')
		.replace(/[.,;:!?)\]}>'"`]+$/, '')
		.trim()

	// 空格分隔的数字 OTP 合并；其它情况取首个像码的 token，避免 "998877 to continue"
	if (/\s/.test(code)) {
		const tokens = code.split(/\s+/).filter(Boolean)
		const allShortDigits = tokens.length > 1 && tokens.every(token => /^\d{1,4}$/.test(token))
		if (allShortDigits) {
			code = tokens.join('')
		} else {
			const preferred = tokens.find(token => /\d/.test(token) || /-/.test(token)) || tokens[0]
			code = preferred || ''
		}
	}

	if (!code || code.length > MAX_CODE_LENGTH || code.length < MIN_CODE_LENGTH) {
		return ''
	}

	// 只允许字母、数字、连字符
	if (!/^[A-Za-z0-9\-]+$/.test(code)) {
		return ''
	}

	// 去掉连字符后仍需有足够有效字符
	if (code.replace(/-/g, '').length < MIN_CODE_LENGTH) {
		return ''
	}

	return code
}

/**
 * 在一段文本中按标签模式提取验证码
 * @param {string} source
 * @returns {string}
 */
function extractLabeledCode(source) {
	if (!source) {
		return ''
	}

	for (const pattern of LABELED_CODE_PATTERNS) {
		const match = source.match(pattern)
		if (!match) {
			continue
		}
		const code = normalizeCode(match[1])
		if (code) {
			return code
		}
	}

	return ''
}

/**
 * 从主题兜底提取常见形态验证码
 * @param {string} subject
 * @returns {string}
 */
function extractSubjectFallbackCode(subject) {
	if (!subject) {
		return ''
	}

	for (const pattern of SUBJECT_FALLBACK_PATTERNS) {
		const match = subject.match(pattern)
		if (!match) {
			continue
		}
		const code = normalizeCode(match[1])
		if (code) {
			return code
		}
	}

	return ''
}

/**
 * 解析邮件中的验证码
 * @param {{ code?: string, subject?: string, formatText?: string, text?: string }} email
 * @returns {string} 验证码；未识别到则返回空字符串
 */
export function resolveVerificationCode(email) {
	if (!email) {
		return ''
	}

	const backendCode = typeof email.code === 'string' ? email.code.trim() : ''
	if (backendCode) {
		return backendCode
	}

	// 标签模式：主题优先，其次预览正文 / 纯文本（不做 HTML 全文，避免样式噪声）
	const labeledSources = [
		email.subject || '',
		email.formatText || '',
		email.text || '',
	]

	for (const source of labeledSources) {
		const code = extractLabeledCode(source)
		if (code) {
			return code
		}
	}

	// 主题兜底：无标签时仍尝试常见码形态
	return extractSubjectFallbackCode(email.subject || '')
}
