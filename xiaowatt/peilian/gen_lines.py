# -*- coding: utf-8 -*-
"""从 data.js 的剧本抽取全部需要数字人念出的固定台词，生成 lines.json"""
import json, re, hashlib, os

B = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(B, 'data.js'), encoding='utf-8').read()

def grab(name):
    i = src.index('const %s=' % name) + len('const %s=' % name)
    j = src.index('\n', i)
    return json.loads(src[i:j].rstrip(';'))

STEPS = grab('STEPS')
RISKS = grab('RISKS')
WUFANG = grab('WUFANG')
LOC = grab('LOC')

lines = []
seen = set()

def add(text, role, tag):
    t = text.strip()
    if not t or t in seen:
        return
    seen.add(t)
    lines.append({
        'id': 'L' + hashlib.md5(t.encode('utf-8')).hexdigest()[:10],
        'role': role,          # jianhu 监护人 / diaodu 调度员 / zhiban 值班负责人
        'tag': tag,
        'text': t
    })

# 1. 准备阶段
add('任玲玲，今天我们有一项操作任务：将110kV仿真站110kV培训三线1163线路由运行转检修。开始前先完成三审、着装互检和风险分析，逐条确认。', 'jianhu', 'prep')
add('检查操作票任务、步骤正确，签名完毕；确认操作人、监护人资格在有效范围内。', 'jianhu', 'prep')
add('穿着纯棉工作服，工作服着装整洁完好，扣子扣全，袖口、裤脚不挽起；操作人佩戴操作人袖章，监护人佩戴好监护人袖章。', 'jianhu', 'prep')
add('安全帽外观正常并在有效期内，佩戴时双手持帽檐，从前至后扣于头顶，调整后箍并系好下颌带。', 'jianhu', 'prep')
add('你的精神状态是否良好？', 'jianhu', 'prep')
add('现在针对此操作任务进行风险分析并落实管控措施，请逐条确认。', 'jianhu', 'prep')

# 2. 12 条风险
for i, r in enumerate(RISKS):
    add('风险%d，%s。管控措施：%s' % (i + 1, r[0], r[1]), 'jianhu', 'risk')

# 3. 五防模拟
add('我们进行五防模拟，检查五防主机、电脑钥匙状态正常，并确认五防系统与后台监控设备状态一致。', 'jianhu', 'wufang')
add('正确，开始模拟。请按操作票顺序逐项模拟。', 'jianhu', 'wufang')
for _, t in WUFANG:
    add(t + '。', 'jianhu', 'wufang')
add('模拟完毕，检查模拟步骤。', 'jianhu', 'wufang')
add('正确。前几项操作均在后台执行，暂不下传电脑钥匙，保持后台操作准备。现在开始执行操作票。', 'jianhu', 'wufang')

# 4. 27 项唱票 / 调度令 / 回报确认 / 规程讲解
for s in STEPS:
    role = 'diaodu' if s.get('act') == 'recv' else 'jianhu'
    add(s['call'], role, 'call-' + s['no'])
    add(s['why'], 'jianhu', 'why-' + s['no'])
for k, v in LOC.items():
    add('去%s。' % v['name'], 'jianhu', 'move')

# 5. 通用口令
for t in ['对，执行。', '收到。本项完成，我已经在操作票上标注对勾。', '执行到位。请检查设备状态并回报。',
          '到现场按设备结构逐项核对四项位置指示，四项一致后再回报。']:
    add(t, 'jianhu', 'order')

# 6. 纠错与红线点评
for t in ['复诵与票面不一致，请按票面文字完整复诵一次。',
          '基本正确，但不够完整。设备双重名称要念全。本项先继续，记一次不规范。',
          '你只复诵了，没有手指操作对象。请手指设备后再复诵一次。',
          '手指的不是本项设备。口到、眼到、手到，三者必须落在同一个对象上。',
          '你操作的不是本项设备。请核对双重名称后重新确认。',
          '本项我还没有发出执行令，不得操作。等我确认"对，执行"。',
          '停一下。操作票必须按顺序逐项执行，你跳过了前面的项目。',
          '不行。GIS刀闸位置不能只看一两项。汇控柜电气指示、机构箱机械指示、拐臂指示、转轴划线标识，四项都要核对到。',
          '回报太简单了。要说清楚设备位置、相关信号和报文的核对结果。本项先记一次不规范。',
          '停！你还没有完成验电就要合地刀。这是红线。',
          '停！现场指示和后台不一致，你还要往下走？凡变化必上报，必须立即中止。',
          '停。你站错间隔了。到每一个操作地点，先核对间隔名称和设备双重名称。',
          '立即中止操作，不得盲目重试。保持现状，我们先汇报。',
          '这一处没有异常触发条件。中止是对的能力，但要有依据。']:
    add(t, 'jianhu', 'correct')

# 7. 票令陷阱与更正
add('等一下。刚才调度下的令和我们操作票这一段的任务不一致。票令不一致，必须中止并汇报值班长。这一项你没有核出来。', 'jianhu', 'trap')
add('现在调度下令：将110kV培训三线1163线路由运行转冷备用。', 'diaodu', 'trap')
add('更正：现在调度下令，将110kV培训三线1163线路由热备用转冷备用。', 'diaodu', 'trap')

# 8. 值班负责人
add('我是值班负责人周建国。收到你们的汇报，11634刀闸机械指示与后台不一致，我立即按变化管理要求向运行部门负责人上报。', 'zhiban', 'abn')
add('专业班组已到场核实，刀闸实际在拉开位置，机构箱指示牌松动已处置完毕，具备恢复操作条件。', 'zhiban', 'abn')
add('处置完毕，具备恢复条件。回到被中止的项目，重新逐项核对四项位置指示。', 'jianhu', 'abn')

# 9. 收尾
add('所有操作项目已逐项完成并复核正确，无跳项、漏项。操作完毕，向调度汇报，并填写操作结束时间。', 'jianhu', 'end')
add('最后一步，退出五防账号和监控后台账号，防止账号被他人继续使用。', 'jianhu', 'end')
add('本次陪练结束，正在生成评估报告。', 'jianhu', 'end')

out = os.path.join(B, 'lines.json')
json.dump(lines, open(out, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
n = {}
for l in lines:
    n[l['role']] = n.get(l['role'], 0) + 1
print('台词总数 %d：%s' % (len(lines), n))
print('总字数 %d' % sum(len(l['text']) for l in lines))
