<template>
    <UModal v-model:open="open" :ui="{ content: 'sm:max-w-3xl' }">
        <template #content>
            <div class="flex flex-col" style="height: 80vh;">
                <!-- 固定头部 -->
                <div class="p-4 space-y-3 shrink-0 border-b border-gray-100 dark:border-gray-800">
                    <div class="flex items-center justify-between">
                        <h3 class="text-lg font-semibold">{{ title }}</h3>
                        <UButton icon="i-lucide-x" color="neutral" variant="ghost" size="sm" @click="open = false" />
                    </div>

                    <!-- 选择模式：已选标签 -->
                    <div v-if="!previewMode && selected.length" class="flex flex-wrap gap-1.5">
                        <UBadge v-for="cid in selected" :key="cid" color="primary" variant="subtle" size="xs"
                            class="cursor-pointer" @click="toggle(cid)">
                            #{{ cid }}
                            <UIcon name="i-lucide-x" class="size-3 ml-0.5" />
                        </UBadge>
                    </div>

                    <!-- 预览模式：类型筛选 + 搜索 + 新增 + 导入 -->
                    <div v-if="previewMode" class="flex items-center gap-2">
                        <USelect v-model="filterType" :items="typeOptions" size="sm" class="w-32" />
                        <UInput v-model="keyword" :placeholder="$t('courseData.searchPlaceholder')"
                            icon="i-lucide-search" size="sm" class="flex-1" />
                        <UButton size="sm" color="primary" variant="soft" icon="i-lucide-plus" @click="addNew">
                            {{ $t('common.add') }}
                        </UButton>
                        <UButton size="sm" color="primary" variant="soft" icon="i-lucide-upload"
                            @click="importOpen = true">
                            {{ $t('courseData.import') }}
                        </UButton>
                    </div>

                    <!-- 选择模式：搜索 + 新增 + 导入 -->
                    <div v-if="!previewMode" class="flex items-center gap-2">
                        <UInput v-model="keyword" :placeholder="$t('courseData.searchPlaceholder')"
                            icon="i-lucide-search" size="sm" class="flex-1" />
                        <UButton size="sm" color="primary" variant="soft" icon="i-lucide-plus" @click="addNew">
                            {{ $t('common.add') }}
                        </UButton>
                        <UButton size="sm" color="primary" variant="soft" icon="i-lucide-upload"
                            @click="importOpen = true">
                            {{ $t('courseData.import') }}
                        </UButton>
                    </div>
                </div>

                <!-- 滚动预览区 -->
                <div class="flex-1 overflow-y-auto p-4">
                    <!-- 加载中 -->
                    <div v-if="loading" class="flex items-center justify-center py-10 text-gray-400">
                        <UIcon name="i-lucide-loader-2" class="animate-spin size-5 mr-2" />
                        <span class="text-sm">{{ $t('common.loading') }}</span>
                    </div>

                    <!-- 预览模式：单条预览 -->
                    <template v-else-if="previewMode">
                        <div v-if="filtered.length && currentItem"
                            class="rounded-lg border-2 border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800">
                                <span class="text-sm font-medium flex-1 truncate">{{ currentItem.name || $t('common.unnamed') }}</span>
                                <span class="text-xs text-gray-400">#{{ currentItem.cid }}</span>
                            </div>
                            <div class="p-3">
                                <component :is="renderComp" :key="currentItem.cid" :node="renderNode" />
                            </div>
                        </div>
                        <div v-else class="flex items-center justify-center h-full text-gray-400 text-sm">
                            {{ $t('courseData.empty') }}
                        </div>
                    </template>

                    <!-- 选择模式：分页列表 -->
                    <template v-else>
                        <div v-if="pagedItems.length" class="space-y-3">
                            <div v-for="item in pagedItems" :key="item.cid"
                                class="rounded-lg border-2 transition-all overflow-hidden"
                                :class="isSelected(item.cid) ? 'border-primary ring-2 ring-primary/20' : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'">
                                <!-- 选中标记 -->
                                <div class="flex items-center gap-2 px-3 py-1.5 bg-gray-50 dark:bg-gray-800 cursor-pointer"
                                    @click="toggle(item.cid)">
                                    <UIcon :name="isSelected(item.cid) ? 'i-lucide-check-circle' : 'i-lucide-circle'"
                                        class="size-4 shrink-0"
                                        :class="isSelected(item.cid) ? 'text-primary' : 'text-muted'" />
                                    <span class="text-sm font-medium flex-1 truncate">{{ item.name || $t('common.unnamed') }}</span>
                                    <span class="text-xs text-gray-400">#{{ item.cid }}</span>
                                    <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost"
                                        @click.stop="editItem(item)" />
                                    <UPopover :modal="true">
                                        <UButton icon="i-lucide-trash" size="xs" color="neutral" variant="ghost"
                                            @click.stop />
                                        <template #content>
                                            <div class="p-3 space-y-2 w-48">
                                                <p class="text-sm text-gray-600 dark:text-gray-300">{{
                                                    $t('courseData.confirmDelete') }}</p>
                                                <div class="flex justify-end gap-2">
                                                    <UButton size="xs" color="error" @click="deleteItem(item)">
                                                        {{ $t('common.delete') }}
                                                    </UButton>
                                                </div>
                                            </div>
                                        </template>
                                    </UPopover>
                                </div>
                                <!-- 实际预览 -->
                                <div class="p-3">
                                    <component :is="renderComp"
                                        :node="{ attrs: { type: singularType, content: String(item.cid) } }" />
                                </div>
                            </div>
                        </div>
                        <div v-else class="flex items-center justify-center h-full text-gray-400 text-sm">
                            {{ $t('courseData.empty') }}
                        </div>
                    </template>
                </div>

                <!-- 固定底部 -->
                <div class="p-4 shrink-0 border-t border-gray-100 dark:border-gray-800 space-y-2">
                    <!-- 预览模式：导航 + 编辑/删除 -->
                    <template v-if="previewMode">
                        <div v-if="filtered.length" class="flex items-center justify-between gap-2">
                            <div class="flex items-center gap-1">
                                <UButton icon="i-lucide-chevron-left" size="sm" color="neutral" variant="ghost"
                                    @click="prev" />
                                <span class="text-xs text-gray-400">{{ currentIndex + 1 }} / {{ filtered.length }}</span>
                                <UButton icon="i-lucide-chevron-right" size="sm" color="neutral" variant="ghost"
                                    @click="next" />
                            </div>
                            <div class="flex items-center gap-2">
                                <UButton size="sm" color="primary" variant="soft" icon="i-lucide-pencil"
                                    :disabled="!currentItem" @click="editCurrent">
                                    {{ $t('common.edit') }}
                                </UButton>
                                <UPopover :modal="true">
                                    <UButton size="sm" color="error" variant="soft" icon="i-lucide-trash"
                                        :disabled="!currentItem">
                                        {{ $t('common.delete') }}
                                    </UButton>
                                    <template #content>
                                        <div class="p-3 space-y-2 w-48">
                                            <p class="text-sm text-gray-600 dark:text-gray-300">{{
                                                $t('courseData.confirmDelete') }}</p>
                                            <div class="flex justify-end gap-2">
                                                <UButton size="xs" color="error" @click="deleteCurrent">
                                                    {{ $t('common.delete') }}
                                                </UButton>
                                            </div>
                                        </div>
                                    </template>
                                </UPopover>
                            </div>
                        </div>
                    </template>

                    <!-- 选择模式：分页 + 确认插入 -->
                    <template v-else>
                        <div v-if="filtered.length" class="flex items-center justify-between">
                            <div class="flex items-center gap-2">
                                <span class="text-xs text-gray-400">
                                    {{ (page - 1) * pageSize + 1 }}-{{ Math.min(page * pageSize, filtered.length) }} /
                                    {{ filtered.length }}
                                </span>
                                <USelect v-model="pageSize" :items="pageSizeOptions" size="xs" class="w-16" />
                            </div>
                            <div class="flex items-center gap-1">
                                <UButton icon="i-lucide-chevron-left" size="xs" color="neutral" variant="ghost"
                                    @click="prevPage" />
                                <span class="text-xs text-gray-400">{{ page }} / {{ totalPages }}</span>
                                <UButton icon="i-lucide-chevron-right" size="xs" color="neutral" variant="ghost"
                                    @click="nextPage" />
                            </div>
                        </div>
                        <div class="flex items-center justify-between">
                            <span class="text-xs text-gray-400">{{ selected.length }} {{ $t('courseData.selected') }}</span>
                            <div class="flex gap-2">
                                <UButton variant="ghost" size="sm" @click="open = false">{{ $t('common.cancel') }}</UButton>
                                <UButton color="primary" size="sm" :disabled="!selected.length" @click="confirm">
                                    {{ $t('courseData.confirmInsert') }} ({{ selected.length }})
                                </UButton>
                            </div>
                        </div>
                    </template>
                </div>
            </div>

            <!-- 编辑弹窗（预览模式：新增/编辑） -->
            <QuestionEdit v-if="editType === 'question'" v-model="editOpen" :question-id="editId" :question="editData"
                @saved="onEditSaved" />
            <HomeworkEdit v-if="editType === 'homework'" v-model="editOpen" :homework-id="editId" :homework="editData"
                @saved="onEditSaved" />
            <CommentEdit v-if="editType === 'comment'" v-model="editOpen" :comment-id="editId" :comment="editData"
                @saved="onEditSaved" />
            <QuizEdit v-if="editType === 'quiz'" v-model="editOpen" :quiz-id="editId" :quiz="editData"
                @saved="onEditSaved" />
            <component v-if="moduleLms && editType === 'race' && RaceEdit" :is="RaceEdit" v-model="editOpen"
                :race-id="editId" :race="editData" @saved="onEditSaved" />

            <!-- 导入弹窗（预览模式） -->
            <UModal v-model:open="importOpen" fullscreen scrollable>
                <template #content>
                    <div class="p-6 space-y-4">
                        <h3 class="text-lg font-semibold">{{ $t('courseData.importTitle') }}</h3>
                        <p class="text-xs text-gray-500">{{ $t('courseData.importHint') }}</p>
                        <div class="h-[400px]">
                            <Monaco v-model="importJson" language="json" />
                        </div>
                        <details v-if="editType === 'question'">
                            <summary>{{ $t('prompt') }}</summary>
                            <pre>
                            ### 通用字段说明

                            所有题型均包含以下统一顶层字段，可作为生成基础模板：

                            | 字段 | 类型 | 说明 |
                            | ------------- | --------------- | ------------------------------- |
                            | `name` | string | 题目编号/名称 |
                            | `content` | string / object | 题干内容，支持markdown文本 |
                            | `options` | array / object | 选项/配置，不同题型结构差异较大 |
                            | `answer` | array | 标准答案，格式随题型变化 |
                            | `point` | number | 题目分值 |
                            | `type` | string | 题型唯一标识 |
                            | `tags` | array | 题目标签，用于分类筛选 |
                            | `extra` | null / any | 扩展字段，通常为 `null` |
                            | `explanation` | string / object | 答案解析，支持markdown文本 |

                            ---

                            ## 各题型详解与生成提示词

                            ### 1. 单选题 `type: "single"`

                            **结构说明**：从多个选项中选出唯一正确答案，答案为正确选项的下标索引。

                            - `content`：字符串，纯文本题干
                            - `options`：字符串数组，每个元素为一个选项
                            - `answer`：数字数组，仅含 1 个元素，为正确选项的下标（从 0 开始）

                            **典型示例**

                            ```json
                            {
                            "name": "Q1",
                            "content": "Which one is the full name of AI?",
                            "options": ["Automatic Information", "Artificial Intelligence", "Advanced Internet",
                            "Application Interface"],
                            "answer": [1],
                            "point": 1,
                            "type": "single",
                            "tags": ["AI"],
                            "extra": null,
                            "explanation": ""
                            }
                            生成提示词
                            生成一道单选题，输出为标准 JSON 对象。题干为【此处替换题目内容】，选项共 4 个，只有 1 个正确答案。answer 字段用数组包裹正确选项的索引下标（从 0 开始），type
                            固定为 "single"，包含完整的通用字段。

                            ---
                            2. 判断题 type: "judge"
                            结构说明：判断题干描述是否正确，固定两个选项。
                            - content：字符串或富文本 Doc 结构，题干可包含代码、段落等
                            - options：长度为 2 的字符串数组，通常为 ["✓ Correct", "✗ Wrong"]
                            - answer：数字数组，[0] 表示正确，[1] 表示错误
                            典型示例
                            {
                            "name": "Q3",
                            "content": "AI can only work on computers and cannot be used on mobile phones.",
                            "options": ["✓ Correct", "✗ Wrong"],
                            "answer": [1],
                            "point": 1,
                            "type": "judge",
                            "tags": ["AI"],
                            "extra": null,
                            "explanation": ""
                            }
                            生成提示词
                            生成一道判断题，输出为标准 JSON 对象。题干为【此处替换题目内容】，选项固定为 ["✓ Correct", "✗ Wrong"]。answer 为数组：正确填 [0]，错误填
                            [1]，type 固定为 "judge"，包含完整通用字段。

                            ---
                            3. 多选题 type: "multiple"
                            结构说明：存在多个正确选项，答案为所有正确选项的下标数组。
                            - content：字符串，纯文本题干
                            - options：字符串数组，选项列表
                            - answer：数字数组，包含所有正确选项的下标
                            典型示例
                            {
                            "name": "Q2",
                            "content": "Which of the following fields belong to the application areas of AI?",
                            "options": ["Face recognition", "Machine translation", "Manual handwriting copying",
                            "Autonomous driving"],
                            "answer": [0, 1, 3],
                            "point": 1,
                            "type": "multiple",
                            "tags": ["AI"],
                            "extra": null,
                            "explanation": ""
                            }
                            生成提示词
                            生成一道多选题，输出为标准 JSON 对象。题干为【此处替换题目内容】，选项共 4 个，包含 2~3 个正确答案。answer 为数组，填入所有正确选项的索引下标，type 固定为
                            "multiple"，分值可设为 2 分，包含完整通用字段。

                            ---
                            4. 选词填空题 type: "select"
                            结构说明：题干中有多处挖空，从给定词库中选择对应词汇填入。
                            - content：字符串，挖空位置用 ||占位符名称|| 标记
                            - options：字符串数组，所有候选词汇
                            - answer：字符串数组，按挖空从左到右的顺序排列正确答案
                            典型示例
                            {
                            "name": "Q5",
                            "content": "In the history of AI, Alan Turing put forward the ||Turing Test|| in 1950, and
                            the ||Dartmouth Workshop|| held in 1956 officially named the term \"Artificial
                            Intelligence\".",
                            "options": ["Turing Test", "Dartmouth Workshop", "Neural Network", "Expert System"],
                            "answer": ["Turing Test", "Dartmouth Workshop"],
                            "point": 1,
                            "type": "select",
                            "tags": [],
                            "extra": null,
                            "explanation": ""
                            }
                            生成提示词
                            生成一道选词填空题，输出为标准 JSON 对象。题干为【此处替换内容】，挖空处用 ||关键词|| 标记，共 N 个空。options 给出所有候选词（包含干扰项），answer
                            为字符串数组，按挖空顺序填入正确词汇，type 固定为 "select"，包含完整通用字段。

                            ---
                            5. 排序题 type: "sort"
                            结构说明：将给定条目按指定规则（时间、逻辑等）排列。
                            - content：字符串，说明排序要求
                            - options：字符串数组，待排序的所有条目
                            - answer：数字数组，元素为选项下标，按正确顺序排列
                            典型示例
                            {
                            "name": "Q8",
                            "content": "Put the following AI historical events in the correct chronological order from
                            earliest to latest.",
                            "options": [
                            "Alan Turing published the paper about Turing Test",
                            "Dartmouth Workshop officially proposed the term \"AI\"",
                            "The first simple neural network model was created",
                            "AlphaGo defeated top human Go player Lee Sedol"
                            ],
                            "answer": [0, 1, 2, 3],
                            "point": 1,
                            "type": "sort",
                            "tags": [],
                            "extra": null,
                            "explanation": ""
                            }
                            生成提示词
                            生成一道排序题，输出为标准 JSON 对象。题干要求【按 XX 规则排序】，options 列出 4 个待排序条目。answer 为数字数组，按正确顺序填入每个条目的索引下标，type
                            固定为 "sort"，包含完整通用字段。

                            ---
                            6. 分类题 type: "classify"
                            结构说明：将多个条目划分到指定类别中。
                            - content：字符串，说明分类要求
                            - options：对象数组，每个对象含 name（类别名）和 items（该类别下的条目数组）
                            - answer：数字数组，长度等于所有条目总数；按「类别顺序 + 类别内条目顺序」拼接所有条目，标注每个条目所属的类别下标（0、1...）
                            典型示例
                            {
                            "name": "Q9",
                            "content": "Classify the following learning tasks into Supervised Learning and Unsupervised
                            Learning.",
                            "options": [
                            {
                            "name": "Supervised Learning",
                            "items": [
                            "Predict house prices based on given housing data and price labels",
                            "Recognize cats and dogs from labeled picture datasets",
                            "Predict students’ exam scores with known historical score records"
                            ]
                            },
                            {
                            "name": "Unsupervised Learning",
                            "items": [
                            "Group customers with similar shopping habits without pre-set labels",
                            "Divide a batch of articles into different topic groups"
                            ]
                            }
                            ],
                            "answer": [0, 0, 0, 1, 1],
                            "point": 1,
                            "type": "classify",
                            "tags": [],
                            "extra": null,
                            "explanation": ""
                            }
                            生成提示词
                            生成一道分类题，输出为标准 JSON 对象。设置 2 个分类，每个分类下包含 2~3 个条目。options 按 [{name, items[]}, ...] 格式书写；answer
                            为数字数组，按所有条目的拼接顺序，依次填入每个条目所属的分类索引（从 0 开始），type 固定为 "classify"，包含完整通用字段。

                            ---
                            7. 配对题 type: "match"
                            结构说明：将左侧概念与右侧描述 / 应用一一对应。
                            - content：字符串，题干说明
                            - options：对象数组，每个对象含 left（左侧项）和 right（右侧项）
                            - answer：数字数组，索引对应左侧项的顺序，值为对应右侧项的索引
                            典型示例
                            {
                            "name": "Q10",
                            "content": "Match each AI technology with its correct typical application.",
                            "options": [
                            {"left": "Computer Vision", "right": "Self-driving car visual detection"},
                            {"left": "Natural Language Processing (NLP)", "right": "Chatbots and machine translation"},
                            {"left": "Reinforcement Learning", "right": "Game AI like AlphaGo"},
                            {"left": "Speech Recognition", "right": "Voice-to-text input"}
                            ],
                            "answer": [0, 1, 2, 3],
                            "point": 1,
                            "type": "match",
                            "tags": [],
                            "extra": null,
                            "explanation": ""
                            }
                            生成提示词
                            生成一道配对题，输出为标准 JSON 对象。左侧为 4 个概念，右侧为 4 个对应描述，顺序打乱。options 按 [{left, right}, ...] 格式书写；answer
                            为数字数组，第 i 位表示第 i 个左侧项对应的右侧项索引，type 固定为 "match"，包含完整通用字段。

                            ---
                            8. 填空题 type: "fill"
                            结构说明：题干中挖空，直接填写答案。支持两种题干形式：
                            纯文本：挖空用 {{ 占位符 }} 标记
                            - options：空字符串数组，长度等于空的数量
                            - answer：字符串数组，按挖空顺序排列正确答案
                            典型示例
                            {
                            "name": "Q4",
                            "content": "The three core elements of AI are {{ data }}, computing power and algorithms.",
                            "options": [""],
                            "answer": ["data"],
                            "point": 1,
                            "type": "fill",
                            "tags": [],
                            "extra": null,
                            "explanation": ""
                            }
                            生成提示词
                            生成一道填空题，输出为标准 JSON 对象。题干中用 {{ 关键词 }} 标记挖空位置，共 N 个空。options 为长度 N 的空字符串数组，answer
                            为字符串数组，按顺序填入每个空的正确答案，type 固定为 "fill"，包含完整通用字段。

                            ---
                            9. 简答题 type: "short-answer"
                            结构说明：开放作答，通过正则表达式自动匹配判分。
                            - content：字符串，题干问题
                            - options：空数组 []
                            - answer：字符串数组，元素为匹配答案的正则表达式
                            典型示例
                            {
                            "name": "Q11",
                            "content": "What are the three core elements of artificial intelligence?",
                            "options": [],
                            "answer": ["^(?=[\\s\\S]*\\b[dD]ata\\b)(?=[\\s\\S]*\\b[cC]omputing
                            [pP]ower\\b)(?=[\\s\\S]*\\b[aA]lgorithms\\b)[\\s\\S]*"],
                            "point": 1,
                            "type": "short-answer",
                            "tags": [],
                            "extra": null,
                            "explanation": ""
                            }
                            生成提示词
                            生成一道简答题，输出为标准 JSON 对象。题干为【问题内容】，options 为空数组。answer
                            为数组，写入一条正则表达式，要求能匹配包含核心关键词的用户输入（支持大小写不敏感、多关键词同时匹配），type 固定为 "short-answer"，包含完整通用字段。

                            ---
                            10. 拼图题 type: "puzzle"
                            结构说明：图片切分拼图题，复原切分后的图片块。
                            - content：通常为空字符串
                            - options：对象，包含 url（图片路径）和 split（切分阶数，如 4 表示 4×4=16 块）
                            - answer：数字数组，0 到 split²-1 的顺序数字，代表正确拼接顺序
                            典型示例
                            {
                            "name": "Q11",
                            "content": "",
                            "options": {"url": "/api/file?pathname=2026-07-02%2F3.png", "split": 4},
                            "answer": [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
                            "point": 1,
                            "type": "puzzle",
                            "tags": [],
                            "extra": null,
                            "explanation": ""
                            }
                            生成提示词
                            生成一道拼图题，输出为标准 JSON 对象。options 为对象，包含图片 url 和切分数 split（例如 3 表示 3×3）。answer 为从 0
                            开始的连续数字数组，长度等于 split*split，代表正确顺序，type 固定为 "puzzle"，包含完整通用字段。

                            ---
                            11. HTML 交互题 type: "html"
                            结构说明：完整可运行的 HTML 页面作为题目，自带交互逻辑与判分能力。
                            - content：完整 HTML 代码字符串，包含 HTML/CSS/JS，通过 parent.postMessage 向父页面回传正确率, 0~1之间
                            - options：空数组 []
                            - answer：数组，通常为 [1]，具体判分由 HTML 内部逻辑实现
                            生成提示词
                            生成一道 HTML 交互题，输出为标准 JSON 对象。content 为完整可运行的 HTML 代码字符串，实现【具体交互功能，如翻牌配对、拖拽等】，内部通过
                            parent.postMessage({ type: 'correct_rate', rate: 正确率 }, '*') 回传得分。options 为空数组，answer 为
                            [1]，type 固定为 "html"，包含完整通用字段。

                            ---

                            </pre>

                        </details>
                        <div v-if="importMsg" class="text-xs" :class="importOk ? 'text-green-500' : 'text-red-500'">
                            {{ importMsg }}
                        </div>
                        <div class="flex justify-end gap-2">
                            <UButton variant="ghost" @click="importOpen = false">{{ $t('common.cancel') }}</UButton>
                            <UButton color="primary" :loading="importing" @click="doImport">
                                {{ $t('courseData.import') }}
                            </UButton>
                        </div>
                    </div>
                </template>
            </UModal>
        </template>
    </UModal>
</template>

<script setup>
import QuestionEdit from './extensions/nodes/vue/question/edit.vue'
import HomeworkEdit from './extensions/nodes/vue/homework/edit.vue'
import CommentEdit from './extensions/nodes/vue/comment/edit.vue'
import QuizEdit from './extensions/nodes/vue/quiz/edit.vue'
import RaceEdit from './extensions/nodes/vue/race/edit.vue'
import QuestionRender from './extensions/nodes/render/vue/question.vue'
import HomeworkRender from './extensions/nodes/render/vue/homework.vue'
import CommentRender from './extensions/nodes/render/vue/comment.vue'
import QuizRender from './extensions/nodes/render/vue/quiz.vue'
import RaceRender from './extensions/nodes/render/vue/race.vue'

const props = defineProps({
    modelValue: { type: Boolean, default: false },
    type: { type: String, default: 'questions' }, // questions | homeworks | comments（选择模式）
    initialSelected: { type: Array, default: () => [] },
    previewMode: { type: Boolean, default: false }, // 预览模式：仅预览/管理，无选择
})
const emit = defineEmits(['update:modelValue', 'confirm'])

const { t } = useI18n()
const { editableCourseId } = useLayoutState()
const toast = useToast()

// race / chatroom 已迁回 doc 模块，组件始终可用；
// moduleLms 仅控制是否在 UI 中显示 race 相关选项（无 lms 时无班级概念）
const { moduleLms } = useRuntimeConfig().public

const courseId = computed(() => editableCourseId.value)

const open = computed({
    get: () => props.modelValue,
    set: (v) => emit('update:modelValue', v),
})

// 选择模式的类型（单数）
// 注：不能用单纯 /s$/ 去尾 s，'quizzes' 会变成 'quizze' 而非 'quiz'，导致 API ?type=quizze 查不到
const singularType = computed(() => {
    const map = { questions: 'question', homeworks: 'homework', comments: 'comment', quizzes: 'quiz', races: 'race' }
    return map[props.type] || props.type.replace(/s$/, '')
})

// 预览模式的类型筛选
const filterType = ref('question')
const typeOptions = computed(() => {
    const list = [
        { label: t('courseData.questionLabel'), value: 'question' },
        { label: t('homework.label'), value: 'homework' },
        { label: t('comment.label'), value: 'comment' },
        { label: t('quiz.label'), value: 'quiz' },
    ]
    if (moduleLms) list.push({ label: t('race.label'), value: 'race' })
    return list
})

// 渲染组件映射
const renderCompMap = computed(() => {
    const map = {
        question: QuestionRender,
        homework: HomeworkRender,
        comment: CommentRender,
        quiz: QuizRender,
    }
    if (moduleLms) map.race = RaceRender
    return map
})
const renderComp = computed(() => {
    const typ = props.previewMode ? filterType.value : singularType.value
    return renderCompMap.value[typ] || null
})

const title = computed(() => {
    if (props.previewMode) return t('courseData.editor')
    const titles = {
        questions: t('courseData.selectQuestions'),
        homeworks: t('courseData.selectHomeworks'),
        comments: t('courseData.selectComments'),
        quizzes: t('quiz.label'),
    }
    if (moduleLms) titles.races = t('race.label')
    return titles[props.type] || t('courseData.editor')
})

const loading = ref(false)
const items = ref([])
const keyword = ref('')
const selected = ref([])
const page = ref(1)
const pageSize = ref(10)
const pageSizeOptions = [
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '50', value: 50 },
    { label: '100', value: 100 },
]
const currentIndex = ref(0)

// 选择模式的过滤（按名称/cid 搜索）
const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    if (props.previewMode) {
        const byType = items.value.filter(i => i.type === filterType.value)
        if (!kw) return byType
        return byType.filter(i =>
            (i.name || '').toLowerCase().includes(kw) || String(i.cid).includes(kw)
        )
    }
    if (!kw) return items.value
    return items.value.filter(i =>
        (i.name || '').toLowerCase().includes(kw) || String(i.cid).includes(kw)
    )
})

const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize.value)))
const pagedItems = computed(() => {
    const start = (page.value - 1) * pageSize.value
    return filtered.value.slice(start, start + pageSize.value)
})

// 分页循环切换
function prevPage() {
    page.value = page.value <= 1 ? totalPages.value : page.value - 1
}
function nextPage() {
    page.value = page.value >= totalPages.value ? 1 : page.value + 1
}

// 每页数量变化时回到第一页
watch(pageSize, () => { page.value = 1 })

// 预览模式当前项
const currentItem = computed(() => filtered.value[currentIndex.value] || null)
const renderNode = computed(() => ({
    attrs: {
        type: currentItem.value?.type || '',
        content: String(currentItem.value?.cid || ''),
    },
}))

// 搜索或类型变化时重置
watch([keyword, () => props.type, filterType], () => {
    page.value = 1
    currentIndex.value = 0
})

function isSelected(cid) {
    return selected.value.includes(cid)
}

function toggle(cid) {
    const idx = selected.value.indexOf(cid)
    if (idx >= 0) selected.value.splice(idx, 1)
    else selected.value.push(cid)
}

function prev() {
    if (filtered.value.length === 0) return
    currentIndex.value = (currentIndex.value - 1 + filtered.value.length) % filtered.value.length
}
function next() {
    if (filtered.value.length === 0) return
    currentIndex.value = (currentIndex.value + 1) % filtered.value.length
}

async function fetchItems() {
    if (!courseId.value) return
    loading.value = true
    try {
        const url = props.previewMode
            ? `/api/courses/content?course_id=${courseId.value}`
            : `/api/courses/content?course_id=${courseId.value}&type=${singularType.value}`
        const data = await cRequest(url)
        items.value = data || []
        currentIndex.value = 0
        page.value = 1
    } catch {
        items.value = []
    } finally {
        loading.value = false
    }
}

function confirm() {
    emit('confirm', [...selected.value])
    open.value = false
}

// ===== 新增/编辑/删除/导入（预览模式 + 选择模式共用） =====
const editOpen = ref(false)
const editType = ref('')
const editId = ref(0)
const editData = ref(null)

async function addNew() {
    editType.value = props.previewMode ? filterType.value : singularType.value
    editId.value = 0
    editData.value = null
    await nextTick()
    editOpen.value = true
}

async function editItem(item) {
    editType.value = item.type
    editId.value = item.cid
    editData.value = {
        name: item.name || '',
        content: item.content || '',
        tags: Array.isArray(item.tags) ? [...item.tags] : [],
        point: item.point || 0,
        ...item.extra,
    }
    await nextTick()
    editOpen.value = true
}

async function editCurrent() {
    if (!currentItem.value) return
    await editItem(currentItem.value)
}

async function onEditSaved() {
    const wasAdding = editId.value === 0
    editOpen.value = false
    await fetchItems()
    if (wasAdding) {
        // 新增后跳转到最后一个
        if (props.previewMode) {
            currentIndex.value = Math.max(0, filtered.value.length - 1)
        } else {
            page.value = totalPages.value
        }
    }
}

async function deleteItem(item) {
    try {
        await cRequest('/api/courses/delete', {
            method: 'POST',
            body: {
                course_id: courseId.value,
                cid: item.cid,
                type: item.type,
            },
        })
        toast.add({ title: t('courseData.deleted'), color: 'success' })
        fetchItems()
    } catch (err) {
        toast.add({ title: err.message || t('courseData.deleteFailed'), color: 'error' })
    }
}

async function deleteCurrent() {
    if (!currentItem.value) return
    await deleteItem(currentItem.value)
}

const importOpen = ref(false)
const importJson = ref(`[\n  {\n    "name": "${t('contentPicker.example')}",\n    "content": "",\n    "point": 1\n  }\n]`)
const importing = ref(false)
const importMsg = ref('')
const importOk = ref(true)

async function doImport() {
    let importItems
    try {
        importItems = JSON.parse(importJson.value)
        if (!Array.isArray(importItems)) throw new Error(t('contentPicker.jsonMustBeArray'))
    } catch (err) {
        importOk.value = false
        importMsg.value = `${t('courseData.importParseError')}: ${err.message}`
        return
    }
    importing.value = true
    importMsg.value = ''
    const currentType = props.previewMode ? filterType.value : singularType.value
    const endpoint = {
        question: '/api/questions/add',
        homework: '/api/homeworks/add',
        comment: '/api/comments/add',
        quiz: '/api/quizzes/add',
        ...(moduleLms ? { race: '/api/races/add' } : {}),
    }[currentType]
    let success = 0
    let failed = 0
    for (const item of importItems) {
        try {
            await cRequest(endpoint, {
                method: 'POST',
                body: { course_id: courseId.value, ...item },
            })
            success++
        } catch {
            failed++
        }
    }
    importing.value = false
    if (success > 0) {
        importOk.value = true
        importMsg.value = `${t('courseData.importSuccess')}: ${success}${failed > 0 ? t('contentPicker.importFailedCount', { count: failed }) : ''}`
        toast.add({ title: importMsg.value, color: 'success' })
        await fetchItems()
        importOpen.value = false
        // 导入后跳转到最后一个
        if (props.previewMode) {
            currentIndex.value = Math.max(0, filtered.value.length - 1)
        } else {
            page.value = totalPages.value
        }
    } else {
        importOk.value = false
        importMsg.value = t('courseData.importFailed')
    }
}

watch(open, (val) => {
    if (val) {
        if (!props.previewMode) {
            selected.value = [...props.initialSelected]
        }
        keyword.value = ''
        page.value = 1
        currentIndex.value = 0
        fetchItems()
    }
})

</script>
