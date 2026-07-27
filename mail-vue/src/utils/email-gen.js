const LOWER_ALPHANUM = 'abcdefghijklmnopqrstuvwxyz0123456789';

const FIRST_NAMES = [
	'james', 'john', 'robert', 'michael', 'william', 'david', 'richard', 'joseph',
	'thomas', 'charles', 'daniel', 'matthew', 'anthony', 'mark', 'steven', 'paul',
	'andrew', 'joshua', 'kenneth', 'kevin', 'brian', 'george', 'timothy', 'ronald',
	'edward', 'jason', 'jeffrey', 'ryan', 'jacob', 'gary', 'nicholas', 'eric',
	'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica',
	'sarah', 'karen', 'lisa', 'nancy', 'betty', 'margaret', 'sandra', 'ashley',
	'dorothy', 'kimberly', 'emily', 'donna', 'michelle', 'carol', 'amanda', 'melissa',
	'deborah', 'stephanie', 'rebecca', 'sharon', 'laura', 'cynthia', 'kathleen', 'amy',
	'angela', 'shirley', 'anna', 'brenda', 'pamela', 'emma', 'nicole', 'helen',
	'samantha', 'katherine', 'christine', 'debra', 'rachel', 'carolyn', 'janet', 'catherine',
	'maria', 'heather', 'diane', 'ruth', 'julie', 'olivia', 'joyce', 'virginia'
];

const LAST_NAMES = [
	'smith', 'johnson', 'williams', 'brown', 'jones', 'garcia', 'miller', 'davis',
	'rodriguez', 'martinez', 'hernandez', 'lopez', 'gonzalez', 'wilson', 'anderson', 'thomas',
	'taylor', 'moore', 'jackson', 'martin', 'lee', 'perez', 'thompson', 'white',
	'harris', 'sanchez', 'clark', 'ramirez', 'lewis', 'robinson', 'walker', 'young',
	'allen', 'king', 'wright', 'scott', 'torres', 'nguyen', 'hill', 'flores',
	'green', 'adams', 'nelson', 'baker', 'hall', 'rivera', 'campbell', 'mitchell',
	'carter', 'roberts', 'gomez', 'phillips', 'evans', 'turner', 'diaz', 'parker',
	'cruz', 'edwards', 'collins', 'reyes', 'stewart', 'morris', 'morales', 'murphy',
	'cook', 'rogers', 'gutierrez', 'ortiz', 'morgan', 'cooper', 'peterson', 'bailey',
	'reed', 'kelly', 'howard', 'ramos', 'kim', 'cox', 'ward', 'richardson',
	'watson', 'brooks', 'chavez', 'wood', 'james', 'bennett', 'gray', 'mendoza'
];

function pickRandom(list) {
	return list[Math.floor(Math.random() * list.length)];
}

function randomChars(length) {
	let result = '';
	for (let i = 0; i < length; i++) {
		result += LOWER_ALPHANUM.charAt(Math.floor(Math.random() * LOWER_ALPHANUM.length));
	}
	return result;
}

/**
 * 生成随机小写字母数字前缀
 * @param {number} length
 * @returns {string}
 */
export function generateRandomLocalPart(length = 8) {
	const safeLength = Math.max(1, Math.min(64, Number(length) || 8));
	return randomChars(safeLength);
}

/**
 * 生成英文人名风格前缀（无符号，如 johnsmith）
 * 长度不足时右侧补随机字母数字，超长则截断
 * @param {number} length
 * @returns {string}
 */
export function generateNameLocalPart(length = 8) {
	const safeLength = Math.max(1, Math.min(64, Number(length) || 8));
	let name = pickRandom(FIRST_NAMES) + pickRandom(LAST_NAMES);

	if (name.length > safeLength) {
		return name.slice(0, safeLength);
	}

	if (name.length < safeLength) {
		name += randomChars(safeLength - name.length);
	}

	return name;
}
