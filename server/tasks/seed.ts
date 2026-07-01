import { db, schema } from '@nuxthub/db'
import { randomBytes, scrypt } from 'node:crypto'

const rand = {
    int: (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min,
    pick: <T>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)],
    bool: (p = 0.5) => Math.random() < p,
    timestamp: (startYear = 2000, endYear = 2025) => {
        const start = new Date(startYear, 0, 1).getTime()
        const end = new Date(endYear, 11, 31).getTime()
        return new Date(start + Math.random() * (end - start))
    },
    ip: () => `${rand.int(10, 200)}.${rand.int(0, 255)}.${rand.int(0, 255)}.${rand.int(1, 255)}`,
    string: (length: number, prefix = '') =>
        prefix + Array.from({ length }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[rand.int(0, 35)]).join(''),
}

const lastNames = ['张', '李', '王', '刘', '陈', '杨', '赵', '黄', '周', '吴']
const firstNames = ['伟', '芳', '娜', '秀英', '敏', '静', '丽', '强', '磊', '洋', '勇', '艳', '杰', '娟', '涛', '明', '超', '秀兰', '霞', '平']
const englishNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Henry', 'Ivy', 'Jack']
const genders = ['male', 'female']

export default defineTask({
    meta: {
        name: 'db:seed',
        description: 'Seed database with new random data every run',
    },
    async run() {
        console.log('🌱 Seeding database (new random batch)...')

        // ---------- 基础幂等：角色 & 权限 ----------
        const permData = [
            { name: '查看课程', code: 'course:read' },
            { name: '编辑课程', code: 'course:write' },
            { name: '管理用户', code: 'user:manage' },
            { name: '发布公告', code: 'announce:write' },
        ]
        await db.insert(schema.permissions).values(permData).onConflictDoNothing()
        const permissions = await db.select().from(schema.permissions)

        const roleData = [
            { name: '管理员', code: 'admin' },
            { name: '教师', code: 'teacher' },
            { name: '学生', code: 'student' },
        ]
        await db.insert(schema.roles).values(roleData).onConflictDoNothing()
        const roles = await db.select().from(schema.roles)

        const rolePermMap: Record<string, string[]> = {
            admin: permissions.map(p => p.id),
            teacher: permissions.filter(p => ['course:read', 'course:write', 'announce:write'].includes(p.code)).map(p => p.id),
            student: permissions.filter(p => p.code === 'course:read').map(p => p.id),
        }
        const rolePermInserts: { roleId: string; permissionId: string }[] = []
        for (const role of roles) {
            const permIds = rolePermMap[role.code]
            if (permIds?.length) {
                permIds.forEach(permissionId => rolePermInserts.push({ roleId: role.id, permissionId }))
            }
        }
        if (rolePermInserts.length) {
            await db.insert(schema.rolePermissions).values(rolePermInserts).onConflictDoNothing()
        }
        console.log('✅ 角色与权限就绪')

        // ---------- 随机班级 ----------
        const classCount = rand.int(5, 10)
        const classData = Array.from({ length: classCount }, (_, i) => ({
            name: `班级_${rand.string(4, 'CL')}_${i}`,
            code: `CLS_${rand.string(3).toUpperCase()}_${Date.now().toString(36)}_${i}`,
        }))
        const classes = await db.insert(schema.classes).values(classData).returning({ id: schema.classes.id })
        console.log(`🏫 班级创建完成 (${classes.length})`)

        // ---------- 随机课程分类 ----------
        const catData = [
            { name: `核心专业课_${rand.string(2)}`, code: `core_${rand.string(3)}` },
            { name: `通识选修_${rand.string(2)}`, code: `general_${rand.string(3)}` },
        ]
        const categories = await db.insert(schema.categories).values(catData).returning()

        // 随机课程
        const courseCount = rand.int(5, 12)
        const courseNames = ['高等数学', '数据库原理', '大学英语', '数据结构', '操作系统', '计算机网络', '软件工程', '人工智能导论', '线性代数', '离散数学']
        const courseInserts = Array.from({ length: courseCount }, () => {
            const name = rand.pick(courseNames) + rand.string(2)
            const code = `COURSE_${rand.string(4).toUpperCase()}_${Date.now().toString(36)}`
            const categoryId = rand.pick(categories).id
            return {
                name,
                code,
                categoryId,
                tags: [rand.pick(['数学', '计算机', '语言', '工程']), rand.pick(['基础', '核心', '进阶'])],
            }
        })
        const courses = await db.insert(schema.courses).values(courseInserts).returning()
        console.log(`📘 课程创建完成 (${courses.length})`)

        // ---------- 随机章节 ----------
        for (const course of courses) {
            const chapterCount = rand.int(2, 5)
            const chapters = Array.from({ length: chapterCount }, (_, i) => ({
                name: `第${i + 1}章 ${rand.string(4, '知识')}`,
                code: `${course.code}_CH${i + 1}_${rand.string(2)}`,
                courseId: course.id,
                userId: null, // 稍后分配作者
                isOpen: rand.bool(0.8),
            }))
            await db.insert(schema.chapters).values(chapters)
        }
        console.log('📖 章节创建完成')

        // ---------- 随机用户生成 ----------
        const userCount = rand.int(40, 60)
        const usersToInsert: Array<{
            user: any
            roleCode: string
            classId: number | null
            isTeacher: boolean
        }> = []

        for (let i = 0; i < userCount; i++) {
            const classObj = rand.pick(classes)
            const classId = classObj.id
            const username = `user_${rand.string(8)}_${Date.now().toString(36)}_${i}`
            const rawPassword = '123456'
            const roleCode = rand.pick(['admin', 'teacher', 'student'])
            const isTeacher = roleCode === 'teacher' || roleCode === 'admin'
            const user = {
                username,
                password: rawPassword, // 临时占位，随后哈希
                name: rand.pick(lastNames) + rand.pick(firstNames),
                preferName: rand.pick(englishNames),
                englishName: rand.pick(englishNames) + (rand.bool() ? rand.int(100, 999) : ''),
                gender: rand.pick(genders),
                rollNumber: classId ? `2024${rand.int(100, 999)}` : null,
                email: `${username}@university.edu.cn`,
                telephone: `138${rand.int(10000000, 99999999)}`,
                strongPwd: rand.bool(0.3),
                defaultLocale: 'zh-CN',
                classId,
                birthday: rand.timestamp(1980, 2006),
                loginAt: rand.timestamp(),
                loginIp: rand.ip(),
                loginLocation: rand.pick(['北京', '上海', '广州', '深圳', '杭州']),
                createdAt: new Date(),
                updatedAt: new Date(),
            }
            usersToInsert.push({ user, roleCode, classId, isTeacher })
        }

        // 密码哈希 + 插入用户
        const saltLength = 16
        const keyLength = 64
        const insertedUsers: Array<{ userId: number; roleCode: string; classId: number | null; isTeacher: boolean }> = []
        const userRolePairs: { userId: number; roleId: string }[] = []
        const userClassPairs: { userId: number; classId: number; isTeacher: boolean }[] = []

        for (const item of usersToInsert) {
            const salt = randomBytes(saltLength).toString('hex')
            const derivedKey = await new Promise<Buffer>((resolve, reject) => {
                scrypt(item.user.password, salt, keyLength, (err, key) => {
                    if (err) reject(err)
                    else resolve(key)
                })
            })
            const hashedPassword = `${salt}:${derivedKey.toString('hex')}`
            const userWithHash = { ...item.user, password: hashedPassword }

            const [inserted] = await db.insert(schema.users).values(userWithHash).returning({ id: schema.users.id })
            const userId = inserted.id
            insertedUsers.push({ userId, ...item })

            const role = roles.find(r => r.code === item.roleCode)
            if (role) userRolePairs.push({ userId, roleId: role.id })
            if (item.classId) {
                userClassPairs.push({ userId, classId: item.classId, isTeacher: item.isTeacher })
            }
        }

        // 批量关联
        if (userRolePairs.length) {
            await db.insert(schema.userRoles).values(userRolePairs).onConflictDoNothing()
        }
        if (userClassPairs.length) {
            await db.insert(schema.userClasses).values(userClassPairs).onConflictDoNothing()
        }
        console.log(`👥 用户创建完成 (${insertedUsers.length})，角色及班级关联已处理`)

        // 为部分章节分配教师作者
        const teacherUsers = insertedUsers.filter(u => u.isTeacher)
        if (teacherUsers.length) {
            const allChapters = await db.select({ id: schema.chapters.id }).from(schema.chapters)
            for (const ch of allChapters) {
                if (rand.bool(0.6)) {
                    const author = rand.pick(teacherUsers)
                    await db.update(schema.chapters)
                        .set({ userId: author.userId })
                        .where(eq(schema.chapters.id, ch.id))
                }
            }
            console.log('✏️ 章节作者随机分配完成')
        }

        return { result: `✅ 成功新增 ${insertedUsers.length} 个用户，${classes.length} 个班级，${courses.length} 门课程` }
    },
})