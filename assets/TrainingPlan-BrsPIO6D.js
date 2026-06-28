import{i as e}from"./chunk-CacB07dV.js";import{n as t,t as n}from"./jsx-runtime-CK2wlole.js";import{a as r,f as i,o as a,r as o}from"./index-CFBInZB5.js";var s=e(t(),1),c={rest:`休息日`,easy:`轻松跑`,tempo:`节奏跑`,interval:`间歇跑`,lsd:`长距离`,strength:`力量训练`,progression:`渐进跑`,fartlek:`法特莱克`,hill:`坡道跑`,recovery:`恢复跑`},l={easy:{text:`轻松`,bg:`bg-primary-fixed`,textColor:`text-on-primary-fixed`},tempo:{text:`乳酸阈值`,bg:`bg-error-container`,textColor:`text-on-error-container`},interval:{text:`间歇`,bg:`bg-status-danger/20`,textColor:`text-status-danger`},lsd:{text:`耐力`,bg:`bg-tertiary-container`,textColor:`text-on-tertiary-container`},strength:{text:`力量`,bg:`bg-surface-variant`,textColor:`text-on-surface-variant`},progression:{text:`渐进`,bg:`bg-primary-fixed`,textColor:`text-on-primary-fixed`},fartlek:{text:`变速`,bg:`bg-tertiary-container`,textColor:`text-on-tertiary-container`},hill:{text:`坡道`,bg:`bg-error-container`,textColor:`text-on-error-container`},recovery:{text:`恢复`,bg:`bg-primary-fixed`,textColor:`text-on-primary-fixed`},rest:{text:`休息`,bg:`bg-surface-variant`,textColor:`text-on-surface-variant`}},u={rest:`bg-surface-variant`,easy:`bg-primary`,tempo:`bg-[#EF4444]`,interval:`bg-[#EF4444]`,lsd:`bg-[#F59E0B]`,strength:`bg-surface-variant`,progression:`bg-primary`,fartlek:`bg-[#F59E0B]`,hill:`bg-[#EF4444]`,recovery:`bg-primary`},d=`https://api.deepseek.com/chat/completions`,f=`你是 EndureMate AI，一位经验丰富的马拉松训练科学顾问。你的知识体系基于 Jack Daniels《跑步方程式》、Matt Fitzgerald《80/20跑步法》、Dr. Andrew Coggan 训练负荷模型等权威理论。

【角色定位】
你是跑者的专属教练，不是泛化 AI。你只专注于：长跑训练科学、马拉松备赛、运动生理学、跑步伤病预防。超出这个范围的问题，请明确说"这不在我的专业范围内"。

【核心能力】
1. VDOT 系统：Jack Daniels VDOT ≈ VO2max（ml/kg/min），是跑步能力的综合指标。VDOT 每提升1，全马成绩约快3-4分钟。VDOT 50 对应 5K≈20:46（4:09/km），全马≈3:02:26（4:19/km）；VDOT 55 对应 5K≈19:16（3:51/km），全马≈2:44:51（3:54/km）。
2. 训练区间（5区间体系）：
   - Z1 恢复区：最大摄氧配速的 59-65%，HRR 50-60%，对话式舒适
   - Z2 有氧基础：最大摄氧配速的 65-75%，HRR 60-75%，是耐力引擎核心，80%时间应在此区
   - Z3 马拉松配速：VDOT 的 75-83%，HRR 75-82%，专项配速适应
   - Z4 乳酸阈值：VDOT 的 83-88%，HRR 82-90%，节奏跑/阈值跑区间
   - Z5 VO2max：VDOT 的 95-102%，HRR 90-100%，5km 比赛配速，每周不超过 2 次
3. CTL/ATL/TSB（Performance Manager Chart）：
   - CTL（Fitness）= 42天指数加权平均训练负荷，每天衰减因子 e^(-1/42)
   - ATL（Fatigue）= 7天指数加权平均，每天衰减因子 e^(-1/7)
   - TSB（Form）= CTL - ATL；>5 状态好，-5~5 平衡，<-15 过度疲劳
   - 安全跑量增幅：每周不超过10%（黄金法则）
4. 80/20 法则：80%训练量应在低强度（Z1-Z2），20%在中高强度（Z3-Z5）
5. 周期化训练：基础期（8-12周）→ 进展期（4-8周）→ 巅峰期（2-4周）→ 减量期（2-3周）
6. 跑步伤病：跑者膝、足底筋膜炎、髂胫束综合征——均与跑量过快增长、力量不足有关

【回答规范】
1. 专业且可操作：给出具体配速（如"5:30-6:00/km"）、具体课表（如"4×1200m @ Z4 配速"），而非模糊建议
2. 数据驱动：有用户数据时必须引用具体数字，不用"某个值"代替
3. 引用依据：建议较复杂时说明理论来源（如"根据 Daniels VDOT 表"）
4. 诚实面对不确定性：如果无法基于有限数据作出判断，明确说明需要哪些额外信息
5. 安全第一：有伤病风险信号时，第一建议永远是减量或休息，而非继续训练

【格式规范】
- 使用 Markdown 格式：**加粗**关键数据，表格展示对比数据
- 用 🟢/🟡/🔴 表示安全/注意/警告级别
- 回答结构：问题诊断 → 具体建议 → 注意事项
- 长回答分章节，每个章节有明确小标题

【禁止行为】
- 不给出医疗诊断（"可能是应力性骨折"可以说，但"你骨折了"不行）
- 不凭空编造数据（如果没有数据，明确说"需要上传数据才能分析"）
- 不给出超出跑步训练范畴的建议
- 不对没有依据的话题过度自信`;function ee(e,t,n,r,i,o){let s=``;if(e&&e.name&&(s+=`

---
【当前用户档案】
`,s+=`- 姓名: ${e.name}\n`,e.age&&(s+=`- 年龄: ${e.age}岁\n`),e.gender&&(s+=`- 性别: ${e.gender}\n`),e.weight&&(s+=`- 体重: ${e.weight}kg\n`),e.height&&(s+=`- 身高: ${e.height}cm\n`),e.restingHr&&(s+=`- 静息心率: ${e.restingHr} bpm（用于精准计算心率区间）\n`),e.goal&&(s+=`- 备赛目标: ${e.goal}\n`),e.injuryHistory&&(s+=`- 伤病史: ${e.injuryHistory}\n`),e.vdot?(s+=`- VDOT: ${e.vdot}（VO2max ≈ ${e.vdot} ml/kg/min）\n`,s+=`- 能力等级: ${e.vdot>=60?`精英跑者（全马 sub-3 能力）`:e.vdot>=55?`进阶跑者（全马 sub-3:30 能力）`:e.vdot>=50?`中高级跑者（全马 sub-4 能力）`:e.vdot>=45?`中级跑者（全马 sub-4:30 能力）`:e.vdot>=40?`初中级跑者（全马 sub-5 能力）`:`初级跑者`}\n`):s+=`- VDOT: 未测算（建议用比赛成绩测算）
`),t&&(t.ctl!==null||n>0)){if(s+=`
【训练负荷数据】
`,s+=`- 累计训练记录: ${n}条\n`,t.ctl!==null){let e=(t.ctl??0)-(t.atl??0);s+=`- CTL（长期体能/Fitness）: ${t.ctl}\n`,s+=`- ATL（近期疲劳/Fatigue）: ${t.atl}\n`,s+=`- TSB（训练状态/Form）: ${e.toFixed(1)} → ${e>10?`🟢 状态良好，适合比赛或高强度训练`:e>-5?`🟡 平衡状态，正常训练`:e>-15?`🟡 轻度疲劳，注意恢复`:`🔴 过度疲劳，建议减量`}\n`,s+=`- 伤病风险: ${t.injuryRisk}\n`,t.weeklyDistance!==null&&(s+=`- 本周跑量: ${t.weeklyDistance}km\n`)}t.riskMessages&&t.riskMessages.length>0&&(s+=`
【自动风险识别】
`,t.riskMessages.forEach(e=>{s+=`- ${e}\n`}))}if(r&&r.length>0&&(s+=`\n【最近${Math.min(r.length,5)}次训练】\n`,r.slice(0,5).forEach((e,t)=>{s+=`${t+1}. ${e.date} | ${e.type} | ${e.distance}km @ ${e.avgPace}/km`,e.avgHr>0&&(s+=` | ${e.avgHr}bpm`),e.injuryParts&&e.injuryParts.length>0&&(s+=` | ⚠️ 记录不适: ${e.injuryParts.join(`、`)}`),s+=`
`})),i&&i.length>0){let e=i.filter(e=>!e.recovered);if(e.length>0){let t=[...new Set(e.flatMap(e=>e.parts))],n=e.some(e=>e.severity===`severe`);s+=`
【伤病记录（活跃）】
`,s+=`- 活跃伤病数：${e.length}条\n`,s+=`- 不适部位：${t.join(`、`)}\n`,s+=`- 严重程度：${n?`🔴 存在严重伤病`:`🟡 有轻微到中度不适`}\n`,e.forEach((e,t)=>{let n=e.severity===`severe`?`严重`:e.severity===`moderate`?`中度`:`轻微`;s+=`  ${t+1}. [${n}] ${e.parts.join(`、`)}`,e.description&&(s+=` - ${e.description}`),s+=`
`}),s+=`- ⚠️ 训练计划已根据伤病情况自动调整
`}}return o&&(s+=a(o)),s||(s+=`

【当前状态】新用户，暂无个人数据和训练记录。请引导用户了解产品功能并收集基本信息。建议：1.去「个人档案」填写基本信息和训练目标；2.在「分析中心」上传 FIT/GPX/TCX 运动数据文件。`),f+s}async function p(e,t,n,r,i,a,o,s,c,l){let u=[{role:`system`,content:ee(r,i,a??0,o,s,c)},...n.slice(-12),{role:`user`,content:e}],f=await fetch(d,{method:`POST`,headers:{"Content-Type":`application/json`,Authorization:`Bearer ${t}`},body:JSON.stringify({model:`deepseek-chat`,messages:u,temperature:l?.temperature??.5,max_tokens:l?.maxTokens??2048,stream:!1})});if(!f.ok){let e=await f.json().catch(()=>({}));throw Error(e.error?.message||`API请求失败 (${f.status})`)}return(await f.json()).choices[0]?.message?.content||`抱歉，我暂时无法回答这个问题。`}var m=`
【基于最新研究的训练原则 - 2025年更新】

1. 【单次距离风险控制 - BJSM 2025研究】
   - 核心发现：单次训练距离超过过去30天最长距离10%以上，损伤风险显著飙升
   - 正确做法：以30天内最长单次距离为基准，每次增幅不超过10%

2. 【周期化训练 - Mayo Clinic研究】
   - 基础期：以有氧为主，逐步增加跑量和强度比例
   - 进展期：引入更多高质量训练，接近目标配速
   - 巅峰期：最强训练量+最高强度，比赛模拟训练
   - 减量期(Taper)：赛前2-3周，跑量减少41-60%，保持强度
   - 每3周大训练量后安排1周减量周（3:1周期）

3. 【80/20法则 - Matt Fitzgerald】
   - 80%训练量在Z1-Z2低强度区间（轻松跑、恢复跑、长距离慢跑）
   - 20%在Z3-Z5中高强度区间（节奏跑、间歇跑、坡道跑、法特莱克）
   - 关键：高强度训练日之间必须有恢复日（至少48小时）

4. 【力量训练整合】
   - 每周至少1-2次力量训练（与跑步日合并或单独安排）
   - 重点：单腿蹲、臀桥、北欧腿弯举、核心训练

5. 【渐进负荷原则 - 2025运动科学共识】
   - 训练计划的核心是渐进性：每周都要在强度/量上略有提升
   - 跑量逐周增长：基础期每周+8-15%，进展期每周+5-10%
   - 配速逐周加快：轻松跑每周快3-5s/km，节奏跑每周快2-3s/km
   - 巅峰期以强度提升为主，跑量稳定或微降
   - 关键：即使用户处于停训恢复期，一旦恢复跑量后配速和强度也应有向上的趋势

6. 【周训练结构模板 - 不可违反】
   这是经过验证的、适合半马备赛的每周训练结构框架：

   **恢复跑(VDOT < 50)：**
   周一: 休息/力量 | 周二: 间歇跑 | 周三: 轻松跑 | 周四: 节奏跑 | 周五: 轻松跑 | 周六: LSD长距离 | 周日: 恢复跑/力量

   **中等水平(VDOT 50-60)：**
   周一: 轻松跑+力量 | 周二: 间歇跑 | 周三: 轻松跑 | 周四: 节奏跑 | 周五: 轻松跑 | 周六: LSD | 周日: 恢复跑+力量

   **高水平(VDOT 60+)：**
   周一: 轻松跑+力量 | 周二: 间歇跑 | 周三: 法特莱克/坡道跑 | 周四: 轻松跑 | 周五: 节奏跑 | 周六: LSD | 周日: 恢复跑+力量

   每周至少安排2个强度训练日（间歇/节奏跑/坡道跑/法特莱克），2个轻松跑日，1个长距离日，1个恢复日，1个休息日。
   每周结构必须相对固定，只在强度/距离上逐周变化。

7. 【间歇跑训练标准配速和结构】
   间歇跑是提升最大摄氧量的核心训练，结构必须科学：

   **VDOT 35-45（5K 24-28分钟）：**
   - 6×1000m @ I配速（间歇休息400m慢跑）
   - 5×1200m @ I配速
   - 8×800m @ I配速
   - 10×600m @ I配速
   总距离约8-12km（含热身冷却）

   **VDOT 45-55（5K 21-24分钟）：**
   - 8×1000m @ I配速
   - 6×1200m @ I配速
   - 10×800m @ I配速
   - 5×1600m @ I配速（高强度）
   总距离约10-14km（含热身冷却）

   **VDOT 55-65（5K 18-21分钟）：**
   - 10×1000m @ I配速
   - 8×1200m @ I配速
   - 6×1600m @ I配速
   - 12×600m @ I配速
   总距离约12-16km（含热身冷却）

   **重要：间歇跑总距离（含热身冷却）通常8-16km，每次间歇段距离必须≥600m！**
   **绝对不要用5×400m这种短间歇，这是田径运动员的训练方式，不适合长跑跑者。**

8. 【节奏跑训练标准】
   节奏跑（Tempo Run）是提升乳酸阈值的核心训练：

   **VDOT 35-45：** 8-12km（含3-6km@T配速，其余热身冷却）
   **VDOT 45-55：** 10-14km（含5-8km@T配速）
   **VDOT 55+：** 12-16km（含7-10km@T配速）

   节奏跑不要加太多修饰语（如"含6km@T配速"），直接写：
   节奏跑 10km @ 4:30-4:40/km
   或者 10km节奏跑（5:30-5:50热身 + 5km@4:30-4:40 + 2:00冷却）

9. 【法特莱克训练标准】
   法特莱克（Fartlek）是变速跑训练，适合在进展期和巅峰期使用：
   - 总距离8-15km
   - 包含4-8组快慢交替：快段300-1000m@I配速，慢段等距离@轻松跑
   - 例：12km法特莱克 = 2km热身 + (4×800m@I + 800m轻松) + 2km冷却

10. 【坡道跑训练标准】
    坡道跑（Hill Repeats）是提升力量和跑步经济性的关键：
    - 总距离6-10km
    - 包含6-10次上坡冲刺：8-15秒全力冲刺，步行下坡恢复
    - 坡度：中等坡度（4-6%），不要选太陡的坡
    - 例：8km坡道跑 = 2km热身 + 8×12s上坡 + 2km冷却

11. 【LSD长距离跑标准】
    LSD是建立有氧基础的关键训练：
    - VDOT 35-45：14-20km @ E配速+15s/km
    - VDOT 45-55：18-25km @ E配速+10s/km
    - VDOT 55+：22-30km @ E配速+5-10s/km
    - 进展期后半段可在最后3-5km提速至M配速
    - 每周LSD距离逐周递增1-2km

12. 【周跑量分配规则 - 80/20原则】
    每周总跑量按以下比例分配（恢复日和休息日除外）：
    - 轻松跑日：占总跑量的30-40%
    - LSD长距离：占总跑量的25-30%
    - 强度训练日（间歇/节奏/法特莱克）：占总跑量的15-25%
    - 恢复跑：占总跑量的10-15%
    例：VDOT 54，周跑量75km → 轻松跑25-30km + LSD20km + 间歇10km + 节奏跑8km + 恢复跑8km + 休息/力量1天

13. 【停训恢复原则 - 按VDOT分档】
   关键：恢复速度和起点必须基于用户的VDOT和训练史，不能一刀切！
   
   **VDOT基准周跑量参考（正常训练期）：**
   - VDOT 35-39：40-50km/周（半马2:09-1:58）
   - VDOT 40-44：50-65km/周（半马1:54-1:46）
   - VDOT 45-49：60-75km/周（半马1:42-1:35）
   - VDOT 50-54：70-85km/周（半马1:32-1:27）
   - VDOT 55-59：80-95km/周（半马1:24-1:20）
   - VDOT 60+：90-110km/周（半马1:18以内）

   **停训后恢复指南（按训练史分层）：**
   训练史3年+的跑者恢复速度远快于新手，能力保留率更高。
   
   停训1个月(15-30天)：
   - 训练史3年+：第1周达基准60-75%，第2周75-90%，第3-4周接近100%
   - 训练史1-3年：第1周达基准50-60%，第2-3周70-85%，第4-5周恢复
   - 新手(<1年)：第1周达基准40-50%，逐步恢复，需5-6周
   
   停训2个月(31-60天)：
   - 训练史3年+：第1周达基准50-65%，第3-4周恢复到80-90%
   - 训练史1-3年：第1周达基准40-50%，第4-5周恢复到75-85%
   
   停训3个月+(>60天)：
   - 训练史3年+：第1周达基准40-55%，第5-6周恢复到80%
   - 训练史1-3年：第1周达基准30-40%，需8-10周恢复

   **实例：VDOT 54（半马1:25，基准70-85km）的跑者，训练史5年，停训1个月：**
   - 第1周：45-55km（60-75%），轻松跑10-14km/次
   - 第2周：55-65km（75-90%），引入一次节奏跑
   - 第3周：65-75km（接近基准），恢复正常强度分配
   - 第4周：回归70-85km基准量
    
   实例：VDOT 40（半马1:54，基准50-65km）的跑者，训练史4年，停训1个月：
   - 第1周：35-42km，轻松跑8-10km/次
   - 第2周：42-52km
   - 第3-4周：恢复到50-60km
    
   **核心理念：已经有能力的跑者要尽快恢复到原有水平，不要当成初学者慢慢爬！**`;function h(e,t,n,r,i,a){let o=`请为我生成一份个性化的跑步训练计划。

【用户档案】
- 年龄: ${e.age||`未知`}岁
- 性别: ${e.gender||`未知`}
- 体重: ${e.weight||`未知`}kg
- 身高: ${e.height||`未知`}cm
- 静息心率: ${e.restingHr||60} bpm
- VDOT: ${e.vdot||`未测算`}
- 备赛目标: ${a||e.goal||`提升有氧能力`}
- 训练史: ${e.runningYears||0}年
- 伤病史: ${e.injuryHistory||`无`}

`;if(n&&n.length>0&&(o+=`【近期训练记录】
`,n.slice(0,10).forEach((e,t)=>{o+=`${t+1}. ${e.date} | ${e.type} | ${e.distance}km @ ${e.avgPace}/km | ${e.avgHr}bpm\n`}),o+=`
`),t&&t.ctl!==null&&(o+=`【当前训练负荷】
- CTL(长期体能): ${t.ctl}
- ATL(近期疲劳): ${t.atl}
- TSB(训练状态): ${((t.ctl??0)-(t.atl??0)).toFixed(1)}
- 本周跑量: ${t.weeklyDistance||0}km
- 伤病风险: ${t.injuryRisk}

`),r&&r.length>0){let e=r.filter(e=>!e.recovered);e.length>0&&(o+=`【活跃伤病】
`,e.forEach(e=>{let t=e.severity===`severe`?`严重`:e.severity===`moderate`?`中度`:`轻微`;o+=`- ${e.parts.join(`、`)}: ${t} (${e.description||`无描述`})\n`}),o+=`
`)}return i&&(o+=`【体能衰减评估】
- 衰减等级: ${i.decayLevel}
- 衰减天数: ${i.gapDays}天未跑步
- 原始VDOT: ${i.originalVDOT}
- 衰减后VDOT: ${i.decayedVDOT}
- 总体衰减: ${i.totalDecayPercent}%
- 建议恢复过渡周数: ${i.recoveryWeeks}周

`),o+=m,o+=`
【请生成训练计划】

你是专业的跑步教练。你必须大胆、科学地设计训练计划，不要过于保守！这个跑者有训练史，你应该根据其实际水平设计有挑战性的计划。

核心要求：
1. 设计6-12周的周期化训练计划，分为：基础期(2-3周)→进展期(3-4周)→巅峰期(2-3周)→减量期(1-2周)
2. 第一周训练量必须基于用户VDOT和训练史推算基准周跑量，按停训恢复系数调整
3. VDOT参考：VDOT 35=5K 28:00/半马2:09(周跑量40-50km)，VDOT 40=5K 24:58/半马1:54(周跑量50-65km)，VDOT 45=5K 22:38/半马1:42(周跑量60-75km)，VDOT 50=5K 20:46/半马1:32(周跑量70-85km)，VDOT 55=5K 19:16/半马1:24(周跑量80-95km)
4. 有3年以上训练史的跑者，恢复期前3-4周周跑量增幅可放宽至15-25%，之后回归10%以内
5. 每周结构必须遵循上方【周训练结构模板】，不可随意安排
6. 每周至少2个强度训练日（间歇/节奏跑/法特莱克/坡道跑），不可只有1个！
7. 强度训练日的间歇/节奏跑结构必须遵循上方的标准配速和距离，不可随意简化
8. 包含基于VDOT的具体配速建议（E/T/M/I/R配速）
9. 必须根据用户的活跃伤病调整训练：有伤病部位时避免高强度冲击该部位
10. 配速逐周递进：每个phase内每周的配速要比上一周快3-5s/km

【输出格式 - 严格JSON，不要任何额外文字】
必须且只能输出如下JSON对象（不要加markdown代码块标记，不要任何解释文字）：

{"weeks":[{"weekNumber":1,"phase":"基础期","phaseDescription":"建立有氧基础","weeklyVolume":55,"days":[{"dayOfWeek":"星期一","type":"easy","title":"轻松跑10km","distance":10,"pace":"5:50-6:10","hrZone":"Z2","insight":"有氧基础"},{"dayOfWeek":"星期二","type":"interval","title":"间歇跑 8×1000m","distance":10,"pace":"热身2km@6:00, 8×1000m@4:10-4:20(400m恢复), 冷却2km","hrZone":"Z4-Z5","insight":"提升最大摄氧量"},{"dayOfWeek":"星期三","type":"rest","title":"休息","insight":"恢复"}]}],"summary":"计划概述","scientificBasis":["依据1"],"keyAdjustments":["调整1"]}

dayOfWeek: 星期一/星期二/星期三/星期四/星期五/星期六/星期日
type: rest/easy/tempo/interval/lsd/strength/fartlek/hill/recovery
phase: 基础期/进展期/巅峰期/减量期

【关键提醒】
- 不要将有训练基础的跑者当成初学者！
- 强度训练必须有挑战性：间歇跑8-10组×1000m以上，节奏跑5-8km@T配速以上
- 轻松跑不要写"恢复跑6km"这种太短的距离，VDOT 50+的轻松跑应该是10-14km
- LSD应该是计划中最长的单次训练，VDOT 50+的LSD应该是20-30km
- 根据用户的实际VDOT、训练史、伤病史和体能衰减情况个性化设计`,o}function g(e){let t=e.match(/```(?:json)?\s*([\s\S]*?)```/),n=t?t[1]:e,r=n.indexOf(`{`);if(r===-1)return null;let i=0,a=!1,o=!1;for(let e=r;e<n.length;e++){let t=n[e];if(o){o=!1;continue}if(t===`\\`&&a){o=!0;continue}if(t===`"`&&!o){a=!a;continue}if(!a){if(t===`{`)i++;else if(t===`}`&&(i--,i===0))return n.substring(r,e+1)}}return null}function _(e){let t=e.trimEnd();if(!t.startsWith(`{`))return null;let n=0,r=!1,i=!1;for(let e=0;e<t.length;e++){let a=t[e];if(i){i=!1;continue}if(a===`\\`&&r){i=!0;continue}if(a===`"`&&!i){r=!r;continue}r||(a===`{`?n++:a===`}`&&n--)}r&&(t+=`"`);let a=/,\s*$/.test(t),o=/:\s*$/.test(t),s=/[{[]\s*$/.test(t),c=/"[^"]*"\s*:\s*$/.test(t);if((a||o||s||c)&&!t.match(/^(.*"[^"]*"\s*:\s*"[^"]*")\s*[,}]?\s*$/s)){let e=t.match(/^(.*}\s*)\s*[,{]?\s*$/s);e&&e[1]&&(t=e[1].replace(/,\s*$/,``))}for(let e=0;e<n;e++)t+=`}`;return t}function v(e){let t=g(e);if(!t){let n=e.match(/```(?:json)?\s*([\s\S]*?)```/),r=n?n[1]:e,i=r.indexOf(`{`);i!==-1&&(t=_(r.substring(i)))}if(!t){let n=e.match(/\{[\s\S]*\}/);n&&(t=n[0])}if(!t)throw console.error(`无法从AI响应中提取JSON，原始响应:`,e.substring(0,500)),Error(`AI返回的内容中未找到有效的训练计划数据。请重试或检查API Key是否有效。

提示：如果持续出现此问题，可能原因：
1. API Key 余额不足或已过期
2. 网络连接不稳定
3. AI模型暂时不可用`);try{let e=JSON.parse(t),n={weeks:(e.weeks||[]).map(e=>({weekNumber:e.weekNumber||1,phase:e.phase||`基础期`,phaseDescription:e.phaseDescription||``,weeklyVolume:e.weeklyVolume||0,days:(e.days||[]).map(e=>({dayOfWeek:e.dayOfWeek||`星期一`,type:y(e.type),title:e.title||`训练`,distance:e.distance,pace:e.pace,hrZone:e.hrZone,duration:e.duration,insight:e.insight||``,safetyNote:e.safetyNote}))})),summary:e.summary||`AI生成的个性化训练计划`,scientificBasis:e.scientificBasis||[],keyAdjustments:e.keyAdjustments||[]};if(!n.weeks||n.weeks.length===0)throw Error(`AI返回的训练计划中没有训练周数据`);return n}catch(e){let n=e instanceof SyntaxError?`JSON解析失败: ${e.message}`:e instanceof Error?e.message:`未知错误`;throw console.error(`解析AI训练计划失败:`,n),console.error(`尝试解析的JSON片段:`,t.substring(0,300)),Error(`无法解析AI生成的训练计划。\n\n错误详情: ${n}\n\n常见原因及解决方法:\n1. API返回被截断 → 已增大token限制，请重试\n2. JSON格式异常 → 请重试，每次生成结果不同\n3. 如持续失败，可尝试手动创建训练计划`)}}function y(e){return[`rest`,`easy`,`tempo`,`interval`,`lsd`,`strength`,`fartlek`,`hill`,`recovery`].includes(e)?e:`easy`}async function te(e,t,n,r,i,a,o){return v(await p(h(t,n,r,i,a,o),e,[],t,n,r?.length||0,r,i,a,{maxTokens:16384,temperature:.3}))}var ne={星期一:0,星期二:1,星期三:2,星期四:3,星期五:4,星期六:5,星期日:6},re={rest:`bg-surface-variant`,easy:`bg-primary`,tempo:`bg-[#EF4444]`,interval:`bg-[#EF4444]`,lsd:`bg-[#F59E0B]`,strength:`bg-surface-variant`,fartlek:`bg-primary`,hill:`bg-[#EF4444]`,recovery:`bg-primary`};function ie(e){let t=[];for(let n of e.weeks)for(let e of n.days){let r=ne[e.dayOfWeek]??0;t.push({id:`ai_plan_w${n.weekNumber}_d${r}`,day:e.dayOfWeek,title:e.title,type:e.type,distance:e.distance,duration:e.duration,pace:e.pace,hrZone:e.hrZone,zoneColor:re[e.type]||`bg-primary`,insight:e.insight,status:`pending`,week:n.weekNumber})}return t}var b=n(),ae=[`建立有氧基础，逐步增加跑量`,`引入强度训练，提升乳酸阈值`,`最大强度训练，比赛配速演练`,`减少训练量，充分休息备战`],oe=[{label:`基础期`,icon:`directions_run`},{label:`进展期`,icon:`trending_up`},{label:`巅峰期`,icon:`landscape`},{label:`减量期`,icon:`downloading`}],x=[`5K进阶`,`10K进阶`,`半马备赛`,`全马备赛`,`有氧基础重建`,`赛后恢复`],S=[{value:`rest`,label:`休息`},{value:`easy`,label:`轻松跑`},{value:`tempo`,label:`节奏跑/Tempo`},{value:`interval`,label:`间歇跑`},{value:`lsd`,label:`长距离慢跑(LSD)`},{value:`strength`,label:`力量训练`}],C=[{value:`ZONE 1 (110-130)`,label:`ZONE 1 恢复`},{value:`ZONE 2 (131-145)`,label:`ZONE 2 有氧`},{value:`ZONE 3 (146-160)`,label:`ZONE 3 节奏`},{value:`ZONE 4 (161-175)`,label:`ZONE 4 乳酸阈`},{value:`ZONE 5 (176+)`,label:`ZONE 5 最大摄氧`}],w=[`星期一`,`星期二`,`星期三`,`星期四`,`星期五`,`星期六`,`星期日`];function se(){let{profile:e,updateProfile:t,currentPhase:n,setPhase:a,trainings:d,setTrainings:f,updateTrainingFeedback:ee,completeTraining:p,selectTraining:m,selectedTraining:h,addTraining:g,updateTraining:_,deleteTraining:v,planAutoGenerated:y,setPlanAutoGenerated:ne,autoGenReason:re,setAutoGenReason:se,dismissAutoGenNotice:ce,trainingRecords:le,metrics:T,injuryRecords:E,decay:ue}=r(),{getActiveApiConfig:de}=o(),fe=i(),[D,O]=(0,s.useState)(!1),[k,A]=(0,s.useState)(null),[,j]=(0,s.useState)(null),[M,N]=(0,s.useState)(``),[P,F]=(0,s.useState)(``),[I,L]=(0,s.useState)(``),[R,z]=(0,s.useState)(!1),[pe,B]=(0,s.useState)(null),[V,me]=(0,s.useState)(null),[H,U]=(0,s.useState)(!1),[W,G]=(0,s.useState)({day:`星期一`,type:`easy`,distance:``,pace:``,hrZone:``}),[K,q]=(0,s.useState)(!1),[J,Y]=(0,s.useState)({day:`星期一`,type:`easy`,distance:``,duration:``,pace:``,hrZone:``,insight:``}),[he,ge]=(0,s.useState)(new Set([1])),X=d.length>0,_e=e.goal&&e.goal!==``,Z=(0,s.useMemo)(()=>{if(d.length===0)return{week:1,percentage:0};let e=d.filter(e=>e.status===`completed`).length,t=d.length,n=t>0?e/t:0;return{week:Math.max(1,Math.min(12,Math.round(n*12))),percentage:Math.round(n*100)}},[d,12]),ve=(0,s.useMemo)(()=>{let e={};for(let t of d)e[t.week]||(e[t.week]=[]),e[t.week].push(t);return Object.entries(e).map(([e,t])=>({week:Number(e),items:t})).sort((e,t)=>e.week-t.week)},[d]),ye=(0,s.useCallback)(e=>{ge(t=>{let n=new Set(t);return n.has(e)?n.delete(e):n.add(e),n})},[]),be=()=>{let e=M;P&&(e+=` · 目标 ${P}`),I&&(e+=` · ${I}`),t({goal:e}),z(!1),N(``),F(``),L(``)},xe=()=>{z(!0);let t=e.goal.split(` · `);if(t.length>0){let e=x.find(e=>t[0].includes(e));e&&N(e)}t.length>1&&t[1].includes(`目标`)&&F(t[1].replace(`目标 `,``)),t.length>2&&L(t[2])},Se=e=>{X&&a(e)},Ce=e=>{V!==e.id&&(Y({day:e.day,type:e.type,distance:e.distance?.toString()||``,duration:e.duration?.toString()||``,pace:e.pace||``,hrZone:e.hrZone||``,insight:e.insight||``}),m(e),q(!0))},Q=(e,t)=>{ee(e,t),setTimeout(()=>{p(e),me(null)},300)},we=e=>{p(e)},$=()=>{m(null),q(!1)},Te=()=>{h&&(Y({day:h.day,type:h.type,distance:h.distance?.toString()||``,duration:h.duration?.toString()||``,pace:h.pace||``,hrZone:h.hrZone||``,insight:h.insight||``}),q(!0))},Ee=()=>{if(!h)return;let e=J.type,t=J.distance?parseFloat(J.distance):void 0,n=J.duration?parseInt(J.duration):void 0,r=J.pace||void 0,i=J.hrZone||void 0,a=J.insight||void 0,o=e===`rest`?`休息`:t?`${S.find(t=>t.value===e)?.label||``} ${t}km`:`${S.find(t=>t.value===e)?.label||``}`;_(h.id,{day:J.day,type:e,distance:t,duration:n,pace:r,hrZone:i,title:o,zoneColor:u[e]||`bg-primary`,...a===void 0?{}:{insight:a}}),q(!1)},De=()=>{W.distance&&(g({id:`training_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,day:W.day,title:W.type===`rest`?`休息`:`${S.find(e=>e.value===W.type)?.label||``} ${W.distance}km`,type:W.type,distance:parseFloat(W.distance),pace:W.pace||void 0,hrZone:W.hrZone||void 0,zoneColor:u[W.type]||`bg-primary`,insight:``,status:`pending`,week:1}),G({day:`星期一`,type:`easy`,distance:``,pace:``,hrZone:``}),U(!1))},Oe=()=>{fe(`/analysis`)},ke=async()=>{let t=de();if(!t){A(`请先在设置中配置DeepSeek API Key`);return}O(!0),A(null),j(null);try{let n=le.slice(0,10).map(e=>({date:e.date,type:e.type,distance:e.distance,avgPace:e.avgPace,avgHr:e.avgHr,injuryParts:e.injuryParts,injuryDescription:e.injuryDescription})),r=await te(t.key,{name:e.name,age:e.age,gender:e.gender,weight:e.weight,height:e.height,restingHr:e.restingHr,goal:e.goal,vdot:e.vdot,runningYears:e.runningYears,injuryHistory:e.injuryHistory},T.ctl===null?void 0:{ctl:T.ctl,atl:T.atl,injuryRisk:T.injuryRisk,fatigueScore:T.fatigueScore,weeklyDistance:T.weeklyDistance},n.length>0?n:void 0,E.length>0?E:void 0,ue,e.goal);f(ie(r)),j(r.summary),ne(!0),se(`AI已根据您的个人档案、训练历史和最新运动科学原理生成个性化训练计划`)}catch(e){console.error(`AI训练计划生成失败:`,e),A(e instanceof Error?e.message:`AI生成训练计划失败，请重试`)}finally{O(!1)}};return(0,b.jsxs)(`div`,{className:`flex flex-col gap-8`,children:[(0,b.jsx)(`div`,{className:`mb-4`,children:(0,b.jsx)(`h2`,{className:`font-headline-xl text-headline-xl-mobile md:text-headline-xl text-text-primary`,children:`训练计划`})}),y&&(0,b.jsxs)(`div`,{className:`bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-start gap-3`,children:[(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[22px] text-primary mt-0.5`,children:`auto_awesome`}),(0,b.jsxs)(`div`,{className:`flex-1`,children:[(0,b.jsx)(`p`,{className:`font-body-sm font-semibold text-text-primary`,children:`训练计划已自动生成`}),(0,b.jsx)(`p`,{className:`font-body-sm text-secondary mt-1`,children:re}),(0,b.jsx)(`p`,{className:`font-body-xs text-secondary mt-2`,children:`你可以点击任意训练卡片进行编辑调整，或在详情面板中修改类型、距离、配速等参数。`})]}),(0,b.jsx)(`button`,{type:`button`,onClick:ce,className:`w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-secondary cursor-pointer border-none shrink-0`,children:(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[16px]`,children:`close`})})]}),(0,b.jsx)(`section`,{className:`data-card rounded-xl p-6`,children:!_e&&!R?(0,b.jsxs)(`div`,{children:[(0,b.jsxs)(`div`,{className:`flex items-center gap-2 mb-6`,children:[(0,b.jsx)(`span`,{className:`material-symbols-outlined text-primary text-[22px]`,children:`flag`}),(0,b.jsx)(`h3`,{className:`font-headline-lg text-headline-lg text-text-primary`,children:`设置你的备赛目标`})]}),(0,b.jsx)(`p`,{className:`font-body-sm text-secondary mb-6 max-w-md`,children:`设定目标后，系统将为你生成个性化的训练计划建议。`}),(0,b.jsxs)(`div`,{className:`space-y-4 max-w-md`,children:[(0,b.jsxs)(`div`,{children:[(0,b.jsx)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:`选择目标类型`}),(0,b.jsxs)(`select`,{value:M,onChange:e=>N(e.target.value),className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer font-body-sm`,children:[(0,b.jsx)(`option`,{value:``,children:`— 请选择 —`}),x.map(e=>(0,b.jsx)(`option`,{value:e,children:e},e))]})]}),(0,b.jsxs)(`div`,{children:[(0,b.jsxs)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:[`目标成绩`,` `,(0,b.jsx)(`span`,{className:`text-secondary font-normal`,children:`(选填)`})]}),(0,b.jsx)(`input`,{type:`text`,value:P,onChange:e=>F(e.target.value),placeholder:`例如: 3:00:00`,className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm`})]}),(0,b.jsxs)(`div`,{children:[(0,b.jsxs)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:[`赛事日期`,` `,(0,b.jsx)(`span`,{className:`text-secondary font-normal`,children:`(选填)`})]}),(0,b.jsx)(`input`,{type:`text`,value:I,onChange:e=>L(e.target.value),placeholder:`例如: 2025-11-15`,className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm`})]}),(0,b.jsx)(`button`,{type:`button`,onClick:be,disabled:!M,className:`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none ${M?`bg-primary text-on-primary hover:brightness-110 active:scale-[0.98]`:`bg-surface-variant text-secondary cursor-not-allowed`}`,children:`保存目标`})]})]}):R?(0,b.jsxs)(`div`,{children:[(0,b.jsxs)(`div`,{className:`flex items-center gap-2 mb-6`,children:[(0,b.jsx)(`span`,{className:`material-symbols-outlined text-primary text-[22px]`,children:`edit`}),(0,b.jsx)(`h3`,{className:`font-headline-lg text-headline-lg text-text-primary`,children:`编辑目标`})]}),(0,b.jsxs)(`div`,{className:`space-y-4 max-w-md`,children:[(0,b.jsxs)(`div`,{children:[(0,b.jsx)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:`选择目标类型`}),(0,b.jsxs)(`select`,{value:M,onChange:e=>N(e.target.value),className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer font-body-sm`,children:[(0,b.jsx)(`option`,{value:``,children:`— 请选择 —`}),x.map(e=>(0,b.jsx)(`option`,{value:e,children:e},e))]})]}),(0,b.jsxs)(`div`,{children:[(0,b.jsxs)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:[`目标成绩`,` `,(0,b.jsx)(`span`,{className:`text-secondary font-normal`,children:`(选填)`})]}),(0,b.jsx)(`input`,{type:`text`,value:P,onChange:e=>F(e.target.value),placeholder:`例如: 3:00:00`,className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm`})]}),(0,b.jsxs)(`div`,{children:[(0,b.jsxs)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:[`赛事日期`,` `,(0,b.jsx)(`span`,{className:`text-secondary font-normal`,children:`(选填)`})]}),(0,b.jsx)(`input`,{type:`text`,value:I,onChange:e=>L(e.target.value),placeholder:`例如: 2025-11-15`,className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm`})]}),(0,b.jsxs)(`div`,{className:`flex gap-3`,children:[(0,b.jsx)(`button`,{type:`button`,onClick:be,disabled:!M,className:`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none ${M?`bg-primary text-on-primary hover:brightness-110 active:scale-[0.98]`:`bg-surface-variant text-secondary cursor-not-allowed`}`,children:`保存目标`}),(0,b.jsx)(`button`,{type:`button`,onClick:()=>z(!1),className:`px-5 py-2.5 bg-surface-container border border-border-subtle rounded-lg text-sm font-medium text-text-primary hover:bg-surface-container-high transition-colors cursor-pointer`,children:`取消`})]})]})]}):(0,b.jsx)(`div`,{children:(0,b.jsxs)(`div`,{className:`flex flex-col md:flex-row md:items-center justify-between gap-4`,children:[(0,b.jsxs)(`div`,{className:`flex flex-col gap-1`,children:[(0,b.jsxs)(`div`,{className:`flex items-center gap-2`,children:[(0,b.jsx)(`span`,{className:`material-symbols-outlined text-status-success text-[20px]`,children:`flag`}),(0,b.jsx)(`span`,{className:`font-label-caps text-label-caps text-secondary uppercase tracking-wider`,children:`当前目标`})]}),(0,b.jsxs)(`div`,{className:`flex items-center gap-3 mt-1`,children:[(0,b.jsx)(`h3`,{className:`font-headline-lg text-headline-lg text-text-primary`,children:e.goal}),(0,b.jsx)(`button`,{type:`button`,onClick:xe,className:`w-7 h-7 flex items-center justify-center rounded-full hover:bg-surface-container transition-colors text-outline-variant hover:text-primary cursor-pointer border-none`,title:`编辑目标`,children:(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[16px]`,children:`edit`})})]}),!X&&(0,b.jsx)(`p`,{className:`font-body-sm text-secondary mt-2`,children:`训练计划将在上传数据后自动生成`})]}),X&&(0,b.jsxs)(`div`,{className:`flex-1 max-w-md`,children:[(0,b.jsxs)(`div`,{className:`flex justify-between mb-2`,children:[(0,b.jsxs)(`span`,{className:`font-body-sm text-secondary`,children:[`进度: 第 `,Z.week,` / `,12,` 周`]}),(0,b.jsxs)(`span`,{className:`font-body-sm font-bold text-primary`,children:[Z.percentage,`%`]})]}),(0,b.jsx)(`div`,{className:`w-full bg-surface-variant h-2 rounded-full overflow-hidden`,children:(0,b.jsx)(`div`,{className:`bg-primary h-full rounded-full transition-all duration-700 ease-out`,style:{width:`${Z.percentage}%`}})})]})]})})}),(0,b.jsxs)(`section`,{className:`data-card rounded-xl p-6`,children:[(0,b.jsxs)(`div`,{className:`flex items-center gap-2 mb-6`,children:[(0,b.jsx)(`span`,{className:`material-symbols-outlined text-primary text-[20px]`,children:`timeline`}),(0,b.jsx)(`h3`,{className:`font-headline-md text-headline-md text-text-primary`,children:`训练阶段`}),!X&&(0,b.jsx)(`span`,{className:`font-body-xs text-secondary ml-2`,children:`(等待数据)`})]}),(0,b.jsxs)(`div`,{className:`flex items-center justify-between relative`,children:[(0,b.jsx)(`div`,{className:`absolute top-1/2 left-0 w-full h-0.5 bg-surface-variant -z-10 -translate-y-1/2`}),oe.map((e,t)=>(0,b.jsxs)(`div`,{className:`relative flex flex-col items-center gap-2`,children:[pe===t&&(0,b.jsxs)(`div`,{className:`absolute -top-12 left-1/2 -translate-x-1/2 z-50 bg-text-primary text-white text-xs px-3 py-1.5 rounded-lg shadow-lg whitespace-nowrap animate-fade-in`,children:[ae[t],(0,b.jsx)(`div`,{className:`absolute bottom-[-4px] left-1/2 -translate-x-1/2 w-2 h-2 bg-text-primary rotate-45`})]}),(0,b.jsxs)(`div`,{className:`flex flex-col items-center gap-2 bg-surface-card px-2 cursor-pointer ${!X&&t!==0?`opacity-40 pointer-events-none`:``}`,onClick:()=>Se(t),onMouseEnter:()=>B(t),onMouseLeave:()=>B(null),children:[(0,b.jsx)(`div`,{className:`w-8 h-8 rounded-full flex items-center justify-center border-4 border-surface-card ${n===t&&X?`bg-primary text-white`:t===0&&!X?`bg-primary/40 text-white`:`bg-surface-variant text-secondary`}`,children:(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[16px]`,children:e.icon})}),(0,b.jsx)(`span`,{className:`font-label-caps text-label-caps ${n===t&&X?`text-primary`:t===0&&!X?`text-primary/60`:`text-secondary`}`,children:e.label})]})]},e.label))]})]}),X?(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(`div`,{className:`flex items-center justify-end gap-3`,children:(0,b.jsxs)(`button`,{type:`button`,onClick:ke,disabled:D,className:`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all cursor-pointer border-none ${D?`bg-surface-variant text-secondary cursor-wait`:`bg-primary/10 text-primary hover:bg-primary/20 active:scale-[0.98]`}`,children:[D?(0,b.jsx)(`div`,{className:`w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin`}):(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[16px]`,children:`refresh`}),D?`生成中...`:`刷新计划`]})}),(0,b.jsx)(`div`,{className:`space-y-3`,children:ve.map(({week:e,items:t})=>{let n=t.reduce((e,t)=>e+(t.distance||0),0),r=t.filter(e=>e.status===`completed`).length,i=he.has(e),a=t[0]?.insight?.match(/当前处于(.+?)，/)?.[1]||``;return(0,b.jsxs)(`div`,{className:`data-card rounded-xl overflow-hidden`,children:[(0,b.jsxs)(`button`,{type:`button`,onClick:()=>ye(e),className:`w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-container-low transition-colors cursor-pointer border-none bg-transparent text-left`,children:[(0,b.jsxs)(`div`,{className:`flex items-center gap-3`,children:[(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[20px] text-primary`,children:i?`expand_less`:`expand_more`}),(0,b.jsxs)(`div`,{children:[(0,b.jsxs)(`span`,{className:`font-headline-sm text-headline-sm text-text-primary`,children:[`第 `,e,` 周`]}),a&&(0,b.jsx)(`span`,{className:`font-body-xs text-secondary ml-2`,children:a})]})]}),(0,b.jsxs)(`div`,{className:`flex items-center gap-4`,children:[(0,b.jsxs)(`span`,{className:`font-body-xs text-secondary`,children:[`周跑量 `,(0,b.jsxs)(`span`,{className:`font-semibold text-text-primary`,children:[n.toFixed(1),`km`]})]}),(0,b.jsxs)(`span`,{className:`font-body-xs text-secondary`,children:[r,`/`,t.length,` 完成`]})]})]}),i&&(0,b.jsx)(`div`,{className:`border-t border-border-subtle`,children:(0,b.jsx)(`div`,{className:`grid grid-cols-7`,children:t.map(e=>{let t=e.type===`rest`,n=e.status===`completed`,r=e.status===`skipped`,i=V===e.id,a=l[e.type];return(0,b.jsxs)(`div`,{onClick:()=>Ce(e),className:`relative flex flex-col border-l-2 first:border-l-0 cursor-pointer transition-all hover:bg-surface-container-low ${e.type===`easy`?`border-primary`:e.type===`tempo`||e.type===`interval`||e.type===`hill`?`border-[#EF4444]`:e.type===`lsd`||e.type===`fartlek`?`border-[#F59E0B]`:`border-surface-variant`} ${n?`bg-status-success/5`:r?`opacity-50`:``}`,children:[(0,b.jsxs)(`div`,{className:`flex items-center justify-between px-3 pt-2.5 pb-1`,children:[(0,b.jsx)(`span`,{className:`text-[11px] font-medium text-secondary uppercase tracking-wide`,children:e.day.replace(`星期`,``)}),n&&(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[13px] text-status-success`,children:`check_circle`}),r&&(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[13px] text-secondary`,children:`cancel`})]}),(0,b.jsx)(`div`,{className:`px-3 mb-1.5`,children:t?(0,b.jsx)(`span`,{className:`inline-block bg-surface-variant text-secondary px-1.5 py-px rounded text-[9px] font-medium`,children:`休息`}):a?(0,b.jsx)(`span`,{className:`inline-block ${a.bg} ${a.textColor} px-1.5 py-px rounded text-[9px] font-medium`,children:a.text}):null}),(0,b.jsx)(`p`,{className:`px-3 font-body-xs font-semibold text-text-primary leading-snug line-clamp-2 mb-1.5`,title:e.title,children:t?`充分休息`:e.title}),!t&&(e.distance!=null||e.pace||e.hrZone)&&(0,b.jsxs)(`div`,{className:`px-3 pb-2 flex flex-wrap gap-x-2 gap-y-0.5 text-[10px] text-secondary`,children:[e.distance!=null&&(0,b.jsxs)(`span`,{children:[e.distance,`km`]}),e.pace&&(0,b.jsx)(`span`,{children:e.pace}),e.hrZone&&(0,b.jsx)(`span`,{children:e.hrZone})]}),t&&(0,b.jsx)(`div`,{className:`flex-1`}),i&&e.status===`pending`&&!t&&(0,b.jsx)(`div`,{className:`px-3 pb-2 pt-1 border-t border-border-subtle mt-auto`,onClick:e=>e.stopPropagation(),children:(0,b.jsxs)(`div`,{className:`flex gap-1`,children:[(0,b.jsx)(`button`,{type:`button`,onClick:()=>Q(e.id,`easy`),className:`flex-1 bg-status-success text-white px-1 py-0.5 rounded text-[9px] font-medium hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none`,children:`轻松`}),(0,b.jsx)(`button`,{type:`button`,onClick:()=>Q(e.id,`normal`),className:`flex-1 bg-primary text-white px-1 py-0.5 rounded text-[9px] font-medium hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none`,children:`正常`}),(0,b.jsx)(`button`,{type:`button`,onClick:()=>Q(e.id,`tired`),className:`flex-1 bg-status-warning text-white px-1 py-0.5 rounded text-[9px] font-medium hover:brightness-110 active:scale-95 transition-all cursor-pointer border-none`,children:`吃力`})]})}),e.status===`pending`&&t&&(0,b.jsx)(`div`,{className:`px-3 pb-2 mt-auto`,onClick:e=>e.stopPropagation(),children:(0,b.jsx)(`button`,{type:`button`,onClick:()=>we(e.id),className:`w-full bg-surface-container text-secondary border border-border-subtle px-1 py-0.5 rounded text-[9px] font-medium hover:bg-surface-variant active:scale-98 transition-all cursor-pointer`,children:`完成`})}),(0,b.jsxs)(`div`,{className:`absolute top-1 right-1 flex gap-0.5 opacity-0 hover:opacity-100 transition-opacity z-20`,children:[(0,b.jsx)(`button`,{type:`button`,onClick:t=>{t.stopPropagation(),m(e)},className:`w-4 h-4 flex items-center justify-center rounded bg-surface-card/90 hover:bg-primary hover:text-white text-secondary transition-all cursor-pointer border-none`,title:`编辑`,children:(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[9px]`,children:`edit`})}),(0,b.jsx)(`button`,{type:`button`,onClick:t=>{t.stopPropagation(),v(e.id)},className:`w-4 h-4 flex items-center justify-center rounded bg-surface-card/90 hover:bg-red-500 hover:text-white text-secondary transition-all cursor-pointer border-none`,title:`删除`,children:(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[9px]`,children:`delete`})})]})]},e.id)})})})]},e)})})]}):(0,b.jsx)(`section`,{className:`data-card rounded-xl p-10 md:p-16`,children:(0,b.jsxs)(`div`,{className:`max-w-lg mx-auto text-center`,children:[(0,b.jsx)(`div`,{className:`w-20 h-20 mx-auto mb-6 rounded-2xl bg-surface-container flex items-center justify-center`,children:(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[40px] text-secondary`,children:`description`})}),(0,b.jsx)(`h3`,{className:`font-headline-lg text-headline-lg text-text-primary mb-2`,children:`还没有训练计划`}),(0,b.jsx)(`p`,{className:`font-body-sm text-secondary mb-10`,children:`你可以通过以下方式获取训练计划：`}),(0,b.jsxs)(`div`,{className:`grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-md mx-auto mb-4`,children:[(0,b.jsxs)(`button`,{type:`button`,onClick:Oe,className:`group flex flex-col items-center gap-3 p-6 rounded-xl border border-border-subtle bg-surface-bright hover:border-primary hover:bg-primary/5 transition-all cursor-pointer`,children:[(0,b.jsx)(`div`,{className:`w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors`,children:(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[24px] text-primary`,children:`upload`})}),(0,b.jsxs)(`div`,{className:`text-left w-full`,children:[(0,b.jsx)(`p`,{className:`font-body-sm font-semibold text-text-primary`,children:`上传数据`}),(0,b.jsx)(`p`,{className:`font-body-xs text-secondary mt-0.5`,children:`自动生成计划`})]})]}),(0,b.jsxs)(`button`,{type:`button`,onClick:ke,disabled:D,className:`group flex flex-col items-center gap-3 p-6 rounded-xl border transition-all cursor-pointer ${D?`border-status-warning bg-status-warning/10 cursor-wait`:`border-border-subtle bg-surface-bright hover:border-status-warning hover:bg-status-warning/5`}`,children:[(0,b.jsx)(`div`,{className:`w-12 h-12 rounded-xl bg-status-warning/10 flex items-center justify-center group-hover:bg-status-warning/20 transition-colors`,children:D?(0,b.jsx)(`div`,{className:`w-6 h-6 border-2 border-status-warning border-t-transparent rounded-full animate-spin`}):(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[24px] text-status-warning`,children:`auto_awesome`})}),(0,b.jsxs)(`div`,{className:`text-left w-full`,children:[(0,b.jsx)(`p`,{className:`font-body-sm font-semibold text-text-primary`,children:D?`AI 生成中...`:`AI 生成`}),(0,b.jsx)(`p`,{className:`font-body-xs text-secondary mt-0.5`,children:D?`正在根据您的数据生成计划`:`基于最新运动科学原理`})]})]})]}),k&&(0,b.jsx)(`div`,{className:`mt-4 p-4 bg-red-50 border border-red-200 rounded-xl max-w-md mx-auto`,children:(0,b.jsxs)(`div`,{className:`flex items-start gap-2`,children:[(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[18px] text-red-500 mt-0.5`,children:`error`}),(0,b.jsxs)(`div`,{className:`flex-1`,children:[(0,b.jsx)(`p`,{className:`font-body-sm font-semibold text-red-700`,children:`生成失败`}),(0,b.jsx)(`p`,{className:`font-body-sm text-red-600 mt-1`,children:k})]}),(0,b.jsx)(`button`,{type:`button`,onClick:()=>A(null),className:`text-red-400 hover:text-red-600 cursor-pointer border-none bg-transparent`,children:(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[16px]`,children:`close`})})]})}),(0,b.jsx)(`div`,{className:`max-w-xs mx-auto`,children:(0,b.jsxs)(`button`,{type:`button`,onClick:()=>U(!H),className:`group w-full flex flex-col items-center gap-3 p-6 rounded-xl border transition-all cursor-pointer ${H?`border-primary bg-primary/5`:`border-border-subtle bg-surface-bright hover:border-tertiary-container hover:bg-tertiary-container/5`}`,children:[(0,b.jsx)(`div`,{className:`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${H?`bg-primary/20`:`bg-tertiary-container/10 group-hover:bg-tertiary-container/20`}`,children:(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[24px] transition-colors ${H?`text-primary`:`text-tertiary-container group-hover:text-tertiary-container`}`,children:H?`close`:`add`})}),(0,b.jsxs)(`div`,{className:`text-left w-full`,children:[(0,b.jsx)(`p`,{className:`font-body-sm font-semibold text-text-primary`,children:H?`取消创建`:`手动创建`}),(0,b.jsx)(`p`,{className:`font-body-xs text-secondary mt-0.5`,children:H?`收起表单`:`自定义训练项`})]})]})}),H&&(0,b.jsxs)(`div`,{className:`mt-6 max-w-md mx-auto text-left bg-surface-container rounded-xl p-6 border border-border-subtle`,children:[(0,b.jsxs)(`h4`,{className:`font-body-sm font-semibold text-text-primary mb-4 flex items-center gap-2`,children:[(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[18px] text-primary`,children:`add_circle`}),`创建训练项`]}),(0,b.jsxs)(`div`,{className:`space-y-4`,children:[(0,b.jsxs)(`div`,{children:[(0,b.jsx)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:`训练日期`}),(0,b.jsx)(`div`,{className:`flex flex-wrap gap-2`,children:w.map(e=>(0,b.jsx)(`button`,{type:`button`,onClick:()=>G(t=>({...t,day:e})),className:`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border-none ${W.day===e?`bg-primary text-on-primary`:`bg-surface-container-low text-secondary hover:bg-surface-variant`}`,children:e},e))})]}),(0,b.jsxs)(`div`,{children:[(0,b.jsx)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:`训练类型`}),(0,b.jsx)(`select`,{value:W.type,onChange:e=>G(t=>({...t,type:e.target.value})),className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer font-body-sm`,children:S.map(e=>(0,b.jsx)(`option`,{value:e.value,children:e.label},e.value))})]}),(0,b.jsxs)(`div`,{className:`grid grid-cols-2 gap-3`,children:[(0,b.jsxs)(`div`,{children:[(0,b.jsx)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:`距离 (km)`}),(0,b.jsx)(`input`,{type:`number`,value:W.distance,onChange:e=>G(t=>({...t,distance:e.target.value})),placeholder:`例如: 8`,min:0,step:.5,className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm`})]}),(0,b.jsxs)(`div`,{children:[(0,b.jsx)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:`目标配速`}),(0,b.jsx)(`input`,{type:`text`,value:W.pace,onChange:e=>G(t=>({...t,pace:e.target.value})),placeholder:`例如: 5:45`,className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm`})]})]}),(0,b.jsxs)(`div`,{children:[(0,b.jsxs)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:[`心率区间`,` `,(0,b.jsx)(`span`,{className:`text-secondary font-normal`,children:`(选填)`})]}),(0,b.jsxs)(`select`,{value:W.hrZone,onChange:e=>G(t=>({...t,hrZone:e.target.value})),className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer font-body-sm`,children:[(0,b.jsx)(`option`,{value:``,children:`— 不限 —`}),C.map(e=>(0,b.jsx)(`option`,{value:e.value,children:e.label},e.value))]})]}),(0,b.jsx)(`button`,{type:`button`,onClick:De,disabled:!W.distance,className:`w-full py-2.5 rounded-lg text-sm font-semibold transition-all cursor-pointer border-none ${W.distance?`bg-primary text-on-primary hover:brightness-110 active:scale-[0.98]`:`bg-surface-variant text-secondary cursor-not-allowed`}`,children:`添加到计划`})]})]})]})}),h&&(0,b.jsxs)(`div`,{className:`fixed inset-0 z-50 flex items-center justify-center p-4`,onClick:$,children:[(0,b.jsx)(`div`,{className:`absolute inset-0 bg-black/40 backdrop-blur-sm`}),(0,b.jsxs)(`div`,{className:`relative bg-surface-card rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto animate-slide-up`,onClick:e=>e.stopPropagation(),children:[(0,b.jsx)(`button`,{type:`button`,onClick:$,className:`absolute top-4 right-4 w-8 h-8 rounded-full bg-surface-container flex items-center justify-center hover:bg-surface-variant transition-colors cursor-pointer border-none z-10`,children:(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[18px] text-secondary`,children:`close`})}),(0,b.jsxs)(`div`,{className:`p-6 space-y-5`,children:[K?(0,b.jsxs)(`div`,{className:`space-y-4`,children:[(0,b.jsxs)(`h4`,{className:`font-body-sm font-semibold text-text-primary mb-4 flex items-center gap-2`,children:[(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[18px] text-primary`,children:`edit_circle`}),`编辑训练项`]}),(0,b.jsxs)(`div`,{children:[(0,b.jsx)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:`星期`}),(0,b.jsx)(`div`,{className:`flex flex-wrap gap-2`,children:w.map(e=>(0,b.jsx)(`button`,{type:`button`,onClick:()=>Y(t=>({...t,day:e})),className:`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer border-none ${J.day===e?`bg-primary text-on-primary`:`bg-surface-container-low text-secondary hover:bg-surface-variant`}`,children:e},e))})]}),(0,b.jsxs)(`div`,{children:[(0,b.jsx)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:`训练类型`}),(0,b.jsx)(`select`,{value:J.type,onChange:e=>Y(t=>({...t,type:e.target.value})),className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer font-body-sm`,children:S.map(e=>(0,b.jsx)(`option`,{value:e.value,children:e.label},e.value))})]}),(0,b.jsxs)(`div`,{className:`grid grid-cols-3 gap-3`,children:[(0,b.jsxs)(`div`,{children:[(0,b.jsx)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:`距离 (km)`}),(0,b.jsx)(`input`,{type:`number`,value:J.distance,onChange:e=>Y(t=>({...t,distance:e.target.value})),placeholder:`例如: 8`,min:0,step:.5,className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm`})]}),(0,b.jsxs)(`div`,{children:[(0,b.jsx)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:`时长 (min)`}),(0,b.jsx)(`input`,{type:`number`,value:J.duration,onChange:e=>Y(t=>({...t,duration:e.target.value})),placeholder:`例如: 45`,min:0,step:5,className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm`})]}),(0,b.jsxs)(`div`,{children:[(0,b.jsx)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:`目标配速`}),(0,b.jsx)(`input`,{type:`text`,value:J.pace,onChange:e=>Y(t=>({...t,pace:e.target.value})),placeholder:`例如: 5:45`,className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm`})]})]}),(0,b.jsxs)(`div`,{children:[(0,b.jsxs)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:[`心率区间`,` `,(0,b.jsx)(`span`,{className:`text-secondary font-normal`,children:`(选填)`})]}),(0,b.jsxs)(`select`,{value:J.hrZone,onChange:e=>Y(t=>({...t,hrZone:e.target.value})),className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all cursor-pointer font-body-sm`,children:[(0,b.jsx)(`option`,{value:``,children:`— 不限 —`}),C.map(e=>(0,b.jsx)(`option`,{value:e.value,children:e.label},e.value))]})]}),(0,b.jsxs)(`div`,{children:[(0,b.jsxs)(`label`,{className:`font-body-sm font-medium text-text-primary mb-1.5 block`,children:[`训练说明`,` `,(0,b.jsx)(`span`,{className:`text-secondary font-normal`,children:`(选填)`})]}),(0,b.jsx)(`textarea`,{value:J.insight,onChange:e=>Y(t=>({...t,insight:e.target.value})),placeholder:`例如: 轻松有氧跑，保持心率在Z2区间`,rows:2,className:`w-full px-3 py-2.5 bg-surface-container-low border border-border-subtle rounded-lg text-text-primary focus:ring-2 focus:ring-primary outline-none transition-all font-body-sm resize-none`})]})]}):(0,b.jsxs)(b.Fragment,{children:[(0,b.jsxs)(`div`,{children:[(0,b.jsx)(`span`,{className:`font-label-caps text-label-caps text-secondary uppercase`,children:h.day}),(0,b.jsx)(`h3`,{className:`font-headline-lg text-headline-lg text-text-primary mt-1`,children:h.title}),(0,b.jsx)(`span`,{className:`inline-block mt-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold capitalize`,children:c[h.type]||h.type})]}),(0,b.jsxs)(`div`,{className:`grid grid-cols-2 gap-3`,children:[h.distance!=null&&(0,b.jsxs)(`div`,{className:`bg-surface-container rounded-lg p-3`,children:[(0,b.jsx)(`p`,{className:`font-body-sm text-secondary text-[11px]`,children:`距离`}),(0,b.jsxs)(`p`,{className:`font-data-display text-data-display text-text-primary text-lg`,children:[h.distance,` `,(0,b.jsx)(`span`,{className:`text-xs text-secondary font-normal`,children:`km`})]})]}),h.pace&&(0,b.jsxs)(`div`,{className:`bg-surface-container rounded-lg p-3`,children:[(0,b.jsx)(`p`,{className:`font-body-sm text-secondary text-[11px]`,children:`目标配速`}),(0,b.jsxs)(`p`,{className:`font-data-display text-data-display text-text-primary text-lg`,children:[h.pace,(0,b.jsxs)(`span`,{className:`text-xs text-secondary font-normal`,children:[` `,`/km`]})]})]}),h.hrZone&&(0,b.jsxs)(`div`,{className:`bg-surface-container rounded-lg p-3`,children:[(0,b.jsx)(`p`,{className:`font-body-sm text-secondary text-[11px]`,children:`心率区间`}),(0,b.jsx)(`p`,{className:`font-data-display text-data-display text-text-primary text-lg`,children:h.hrZone})]}),h.duration!=null&&(0,b.jsxs)(`div`,{className:`bg-surface-container rounded-lg p-3`,children:[(0,b.jsx)(`p`,{className:`font-body-sm text-secondary text-[11px]`,children:`预计时长`}),(0,b.jsxs)(`p`,{className:`font-data-display text-data-display text-text-primary text-lg`,children:[h.duration,(0,b.jsxs)(`span`,{className:`text-xs text-secondary font-normal`,children:[` `,`min`]})]})]})]}),h.insight&&(0,b.jsx)(`div`,{className:`bg-primary/5 border border-primary/10 rounded-xl p-4`,children:(0,b.jsxs)(`div`,{className:`flex items-start gap-2`,children:[(0,b.jsx)(`span`,{className:`material-symbols-outlined text-primary text-[18px] shrink-0 mt-0.5`,children:`auto_awesome`}),(0,b.jsxs)(`div`,{children:[(0,b.jsx)(`p`,{className:`font-body-sm font-semibold text-text-primary mb-1`,children:`AI 洞察`}),(0,b.jsx)(`p`,{className:`font-body-sm text-secondary leading-relaxed`,children:h.insight})]})]})}),(h.type===`tempo`||h.type===`interval`)&&(0,b.jsxs)(`div`,{className:`bg-status-warning/5 border border-status-warning/20 rounded-xl p-4`,children:[(0,b.jsxs)(`p`,{className:`font-body-sm font-semibold text-text-primary mb-2 flex items-center gap-1.5`,children:[(0,b.jsx)(`span`,{className:`material-symbols-outlined text-[16px] text-status-warning`,children:`lightbulb`}),`备选方案`]}),(0,b.jsxs)(`ul`,{className:`font-body-sm text-secondary space-y-1 list-disc pl-4`,children:[(0,b.jsx)(`li`,{children:`身体不适时可将配速降 15-20s/km`}),(0,b.jsx)(`li`,{children:`改为 60% 距离的轻松跑 + 核心训练`}),(0,b.jsx)(`li`,{children:`完全无法完成时改为交叉训练（游泳/骑行）`})]})]})]}),(0,b.jsx)(`div`,{className:`flex gap-3 pt-2`,children:K?(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(`button`,{type:`button`,onClick:Ee,className:`flex-1 bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer border-none`,children:`保存修改`}),(0,b.jsx)(`button`,{type:`button`,onClick:()=>q(!1),className:`flex-1 bg-surface-container text-text-primary border border-border-subtle py-2.5 rounded-xl text-sm font-medium hover:bg-surface-variant active:scale-[0.98] transition-all cursor-pointer`,children:`取消`})]}):(0,b.jsxs)(b.Fragment,{children:[(0,b.jsx)(`button`,{type:`button`,onClick:Te,className:`px-4 py-2.5 bg-surface-container text-text-primary border border-border-subtle rounded-xl text-sm font-medium hover:bg-surface-variant active:scale-[0.98] transition-all cursor-pointer`,children:`编辑`}),h.status===`pending`&&h.type!==`rest`?(0,b.jsx)(`button`,{type:`button`,onClick:()=>{p(h.id),$()},className:`flex-1 bg-surface-container text-text-primary border border-border-subtle py-2.5 rounded-xl text-sm font-medium hover:bg-surface-variant active:scale-[0.98] transition-all cursor-pointer`,children:`标记完成`}):h.status===`pending`&&h.type===`rest`?(0,b.jsx)(`button`,{type:`button`,onClick:()=>{we(h.id),$()},className:`flex-1 bg-surface-container text-text-primary border border-border-subtle py-2.5 rounded-xl text-sm font-medium hover:bg-surface-variant active:scale-[0.98] transition-all cursor-pointer`,children:`标记休息日`}):(0,b.jsx)(`button`,{type:`button`,onClick:$,className:`flex-1 bg-surface-container text-text-primary border border-border-subtle py-2.5 rounded-xl text-sm font-medium hover:bg-surface-variant active:scale-[0.98] transition-all cursor-pointer`,children:`关闭`})]})}),!K&&h.status===`pending`&&h.type!==`rest`&&(0,b.jsxs)(`div`,{children:[(0,b.jsx)(`p`,{className:`font-body-sm text-secondary mb-2`,children:`训练反馈`}),(0,b.jsxs)(`div`,{className:`flex gap-2`,children:[(0,b.jsx)(`button`,{type:`button`,onClick:()=>{Q(h.id,`easy`),$()},className:`flex-1 bg-status-success text-white py-2 rounded-xl text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer border-none`,children:`轻松`}),(0,b.jsx)(`button`,{type:`button`,onClick:()=>{Q(h.id,`normal`),$()},className:`flex-1 bg-primary text-white py-2 rounded-xl text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer border-none`,children:`正常`}),(0,b.jsx)(`button`,{type:`button`,onClick:()=>{Q(h.id,`tired`),$()},className:`flex-1 bg-status-warning text-white py-2 rounded-xl text-sm font-semibold hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer border-none`,children:`吃力`})]})]})]})]})]}),(0,b.jsx)(`style`,{children:`
        @keyframes fade-in {
          from { opacity: 0; transform: translateX(-50%) translateY(4px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.2s ease-out forwards;
        }
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.25s ease-out forwards;
        }
      `})]})}export{se as default};