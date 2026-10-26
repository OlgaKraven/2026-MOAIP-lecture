from pathlib import Path
import argparse, copy, hashlib, json, random, re, sys

root=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(root/'authoring'))
from content import COURSE
from teaching import DETAILS
from short_cases import SHORT

parser=argparse.ArgumentParser()
parser.add_argument('--brainm',type=Path)
args=parser.parse_args()
def write(path,data):
    path.parent.mkdir(parents=True,exist_ok=True)
    path.write_bytes((json.dumps(data,ensure_ascii=False,indent=2)+'\n').encode('utf-8'))
def clean(value):
    if isinstance(value,dict):return {('from' if k=='from_' else k):clean(v) for k,v in value.items()}
    if isinstance(value,list):return [clean(v) for v in value]
    return value

sources={
'git':('Чакон С., Страуб Б. Pro Git. 2-е изд. Разделы об индексе, ветках и работе с историей.','https://git-scm.com/book/ru/v2'),
'review':('Google Engineering Practices. Code Review Developer Guide: предмет проверки, контекст и повторное ревью.','https://google.github.io/eng-practices/review/'),
'analysis':('IEEE Computer Society. Guide to the Software Engineering Body of Knowledge (SWEBOK Guide), Version 4.0a. Software Quality; Software Testing; Software Engineering Models and Methods.','https://www.computer.org/education/bodies-of-knowledge/software-engineering'),
'jdk':('Oracle. JDK 25 Tool Specifications: javac, java, javap. Документация инструментов Java.','https://docs.oracle.com/en/java/javase/25/docs/specs/man/index.html'),
'jdk-tools':('Oracle. JDK 25 Tool Specifications: jdeps, jcmd, jfr. Возможности и ограничения диагностических команд.','https://docs.oracle.com/en/java/javase/25/docs/specs/man/index.html'),
'cpp':('GNU. The C Preprocessor: Macros; Conditional Syntax; Preprocessor Output.','https://gcc.gnu.org/onlinedocs/cpp/'),
'cdt':('Eclipse Foundation. C/C++ Development User Guide: проект, индексатор, сборка и отладка.','https://help.eclipse.org/latest/topic/org.eclipse.cdt.doc.user/getting_started/cdt_o_tutorial.htm'),
'hooks':('Git. githooks: события, локальные и серверные hooks, условия запуска.','https://git-scm.com/docs/githooks'),
'vcs':('Apache Subversion. Documentation; Git. Pro Git. Модели истории и рабочей копии.','https://subversion.apache.org/docs/'),
'linux':('Linux man-pages. inode(7), path_resolution(7), chmod(2), umask(2): права и разрешение путей.','https://www.kernel.org/doc/man-pages/'),
'ide':('Apache Maven. Introduction to the Build Lifecycle. Воспроизводимый процесс сборки вне IDE.','https://maven.apache.org/guides/introduction/introduction-to-the-lifecycle.html'),
'gdb':('GNU. Debugging with GDB: Compilation; Stopping; Examining Data.','https://sourceware.org/gdb/current/onlinedocs/gdb.html/'),
'netbeans':('Apache NetBeans. Java Quick Start Tutorial; Apache Maven — запуск и модель Java-проекта.','https://netbeans.apache.org/tutorial/main/kb/docs/java/quickstart/')}
primary=[
dict(citation='Цехановский В. В., Водяхо А. И. Проектирование информационных систем: архитектуры и платформы. Москва: Ай Пи Ар Медиа, 2023. 240 с. ISBN 978-5-4497-1786-3. IPR СМАРТ; доступ по учётной записи.',url='https://www.iprbookshop.ru/books/123568/details'),
dict(citation='Грекул В. И., Денищенко Г. Н., Коровкина Н. Л. Проектирование информационных систем. 4-е изд. Москва: ИНТУИТ, Ай Пи Ар Медиа, 2024. 299 с. ISBN 978-5-4497-3335-1. IPR СМАРТ; доступ по учётной записи.',url='https://www.iprbookshop.ru/books/142298/details')]
additional=dict(citation='Достовалов Д. Н., Лауферман О. В. Объектно-ориентированный анализ и проектирование. Задачи и примеры на C++. Новосибирск: НГТУ, 2022. 74 с. ISBN 978-5-7782-4708-6. IPR СМАРТ; доступ по учётной записи.',url='https://www.iprbookshop.ru/books/126577/details')
course=dict(schemaVersion=1,contentVersion='moaip-2026-10-26-2',id='moaip',code='МДК.03.01',discipline='Моделирование и анализ программного обеспечения',year='2026–2027',heroTitle='Моделирование и анализ',heroAccent='программного обеспечения',slogan='Модели, код и обоснованные решения.',mascot='brand/rhino-moaip.png',mascotAlt='Носорог исследует историю изменений и сравнивает код',logo='brand/synergy-wordmark.jpg',mark='brand/synergy-mark.png',ornament='brand/side-ornament.png',font='fonts/raleway-cyrillic.woff2',topicArrow='brand/topic-arrow.webp',materialsUrl='https://disk.yandex.ru/d/mktM92DijaqmTg',codeExamplesUrl='https://github.com/OlgaKraven/2026-MOAIP-lecture/tree/main/examples',demo=False,semesters=[5,6],literature=dict(primary=primary,additional=[additional]),assessment=dict(mode='autonomous',url='assessment.json'),lectures=[],curriculum=[],glossary=[])
course['font']='fonts/raleway-regular.woff2'
notes={}; keys={}; models={}; explanations={}; coverage=[]
def make_model(mid,title,cases,task):
    scenarios=[]
    for i,c in enumerate(cases):
        frames=[dict(label=label,variables={k:str(v) for k,v in variables.items()}) for label,variables in c['states']]
        scenarios.append(dict(id=f'case-{i+1}',title=('Самостоятельный случай' if len(cases)==1 else ['Исходный пример','Изменённые условия'][i]),given=c['given'],frames=frames,review=c['result'],accepted=[c['answer']],hint='Ответ пока не совпал. Сверьте условие с последним состоянием и проверьте единицы или обозначение редакции.',**({'code':c['code']} if c.get('code') else {})))
    models[mid]=dict(id=mid,title=title,lectureId=item['id'],revision=course['contentVersion'],demonstration=len(cases)>1,mode='table',task=task,output='Здесь показана учебная модель состояний. Команды из примера выполняются отдельно в указанной среде.',scenarios=scenarios)
    return mid

for item in COURSE:
    lecture={k:v for k,v in item.items() if k!='units'}
    lecture.update(sourceTitle=item['title'],question=item['units'][0]['practice']['given'],slides=[])
    def add(kind,title,script='',answer='',questions='',**fields):
        number=len(lecture['slides'])+1
        sid=f'{item["id"]}-s{number:03}'
        slide=dict(id=sid,kind=kind,title=title,kicker=fields.pop('kicker',''),**fields)
        lecture['slides'].append(slide)
        notes[sid]=dict(script=script,preparation='Для командных примеров используйте отдельную учебную папку и версии инструментов, указанные в условии. Не выполняйте команды над рабочими данными.' if slide.get('code') else '',notebook=slide.get('notebook',''),questions=questions,answer=answer,estimatedSeconds=max(20,round(len(script.split())/1.8)+(60 if kind=='test' else 0)))
        return slide
    add('title',item['title'],script='Сегодня исследуем тему «'+item['title']+'». Нам понадобятся конкретные входы и проверяемые наблюдения: вывод должен следовать из данных, а не из названия инструмента. Первый вопрос связан со случаем: '+item['units'][0]['worked']['given'],body=course['discipline'],kicker='Лекция')
    add('literature','Основная литература',script='Архитектуру и проектные решения рассматриваем по Цехановскому и Водяхо; связь требований, моделей и процесса разработки — по Грекулу, Денищенко и Коровкиной. Для точных команд используем отдельные предметные первоисточники следующего экрана.',readingGroup='primary',references=primary)
    refids=list(dict.fromkeys(q['source'] for q in item['units']))
    refs=[dict(citation=sources[k][0],url=sources[k][1]) for k in refids]
    add('literature','Дополнительная литература и источники',script='На этом экране предметные источники темы. '+ ' '.join(sources[k][0] for k in refids)+' Проверяем поддерживаемые параметры в своей установленной версии. Учебные измерения и продукты A, B ниже условны; они не являются внешним рейтингом.',readingGroup='additional',references=refs)
    preparation=('Перед первым стендом Git настройте в своей копии проекта ваши реальные данные: git config user.name "Ваше имя" и git config user.email "ваша почта". Windows: Python 3 запускается как py -3, Linux/macOS: python3.' if item['id']=='s05-01-team-git' else 'Материалы дисциплины и воспроизводимые примеры.')
    add('materials','Материалы курса',script='Ссылка и QR ведут в папку материалов этой дисциплины. Для воспроизводимых примеров доступен репозиторий курса по отдельной ссылке на экране. Все необходимые условия задач приведены в лекции. Перед командной практикой откройте полный исходник указанного примера и сопоставьте его с условием. '+preparation,body=preparation)
    add('agenda','Вопросы лекции',script='Вопросы этой лекции: '+ '; '.join(f'{i+1}. {u["title"]}' for i,u in enumerate(item['units']))+'. Каждый блок связывает исходное состояние, механизм, разобранный пример и самостоятельную проверку результата.',kicker='План')
    first=len(lecture['slides'])
    for qi,u in enumerate(item['units'],1):
        detail=copy.deepcopy(DETAILS[item['id']][qi-1])
        def command_platform(value):
            if isinstance(value,str):return value.replace('python ',('python3 ' if item['id']=='s06-03-validation' and qi==2 else 'py -3 '))
            if isinstance(value,list):return [command_platform(x) for x in value]
            if isinstance(value,tuple):return tuple(command_platform(x) for x in value)
            if isinstance(value,dict):return {k:command_platform(v) for k,v in value.items()}
            return value
        detail=command_platform(detail)
        if detail:
            u['mechanism']=[detail['mechanism'],detail['why']]
            u['practice']=dict(given=detail['practice'],states=detail['practiceStates'],result=detail['practiceReview'],answer=detail['practiceAnswer'])
        start=len(lecture['slides']); tag=f'Вопрос {qi}'; terms=u['terms']
        source=sources[u['source']][0]
        add('section',u['title'],script='Поставим предметный вопрос: '+u['worked']['given']+' Прежде чем выбирать действие, отделим исходные данные, правило и наблюдаемый результат.',body=u['worked']['given'],kicker=tag,source=source)
        if detail:
            add('theory','Предметная ситуация и исходное состояние',script=detail['context']+' Мы будем проверять, как из этих данных получается результат, и сохранять различие между фактом и предположением.',body=detail['context'],kicker=tag)
        for ti in [0,2]:
            definitions='\n'.join(a+' — '+b for a,b in terms[ti:ti+2])
            add('notebook',('Основные понятия' if ti==0 else 'Что различаем при анализе'),script=' '.join(a+' — '+b for a,b in terms[ti:ti+2]),notebook=definitions,kicker=tag)
        if detail:
            environment=('Windows: py -3; Linux/macOS: python3. В Linux замените префикс команды Python.' if 'py -3 ' in detail['artifact'] else 'Пример для Linux shell.' if item['id']=='s06-03-validation' and qi==2 else 'Исходные данные для следующих действий приведены полностью.')
            add('example',detail['artifactTitle'],script='Перед нами полный исходный артефакт рассматриваемого случая. '+detail['context']+' '+environment+' Показ: прочитайте входы и требуемый выход, затем сопоставьте их с механизмом на следующем экране.',code=detail['artifact'],body=environment,kicker=tag)
        add('theory','Как работает механизм',script=u['mechanism'][0],body=u['mechanism'][0],kicker=tag,source=source)
        if detail:
            add('theory','Почему получается этот результат',script=detail['why'],body=detail['why'],kicker=tag)
        visual=clean(u['visual'])
        if visual['type']=='comparison':
            interpretation=' '.join('Для строки «'+row[0]+'» сопоставляем '+ '; '.join(f'{col}: {v}' for col,v in zip(visual['columns'][1:],row[1:]))+'.' for row in visual['rows'])
        elif visual['type']=='network':
            ns={n['id']:n['title'] for n in visual['nodes']}
            interpretation=' '.join(f'Связь {ns[e["from"]]} → {ns[e["to"]]} означает: {e["label"]}.' for e in visual['edges'])
        else:interpretation=' '.join(a['title']+': '+a['text']+'.' for a in visual['items'])
        add('process','Разбор связей и условий',script=interpretation+' Обратите внимание: '+visual['caption'],visual=visual,kicker=tag)
        if detail:
            for ai in range(0,len(detail['actions']),2):
                actions=detail['actions'][ai:ai+2]
                text='\n\n'.join(f'{ai+j+1}. {a}. {b}' for j,(a,b) in enumerate(actions))
                add('theory','Порядок действий: '+str(ai+1)+'–'+str(ai+len(actions)),script=text+' Переходите дальше после сверки наблюдения. При другом результате вернитесь к входным данным и последней выполненной операции.',body=text,kicker=tag)
        mid=make_model(item['id']+f'-q{qi}-example',u['title'],[u['worked'],u['changed']],u['worked']['given'])
        trace=' '.join(label+': '+', '.join(k+' = '+str(v) for k,v in state.items())+'.' for label,state in u['worked']['states'])
        add('example','Пошаговый пример',script='Проследим исходный случай. '+u['worked']['given']+' '+trace+' '+u['worked']['result']+' Показ: «Развернуть схему» открывает рабочую область, «Далее» меняет состояние, «Назад» возвращает предыдущий снимок. Это модель наблюдений, а не исполнение команд браузером.',body=u['worked']['given'],learning=dict(id=mid),kicker=tag)
        changed=u['changed']; rows=[[label,'; '.join(k+' = '+str(v) for k,v in state.items())] for label,state in changed['states']]
        add('example','Изменённое условие',script=changed['given']+' '+ ' '.join(a+': '+b+'.' for a,b in rows)+' '+changed['result']+' Мы сохранили способ анализа, но изменили существенное условие. Сравните новый результат с исходным и назовите причину различия.',body=changed['given'],visual=dict(type='comparison',columns=['Шаг','Наблюдение'],rows=rows,caption=changed['result']),kicker=tag)
        wrong,effect,fix=u['pitfall']
        add('warning','Типичная ошибка и граница вывода',script='Ошибочный ход: '+wrong+' Его последствие: '+effect+' Правильное действие: '+fix+' Это ограничивает вывод по нашему примеру и не требует делать утверждения о непроверенных случаях.',body=wrong+' '+effect,notebook=fix,kicker=tag)
        pid=make_model(item['id']+f'-q{qi}-practice','Самостоятельный разбор: '+u['title'],[u['practice']],u['practice']['given'])
        p=u['practice']
        solution=' '.join(label+': '+', '.join(k+' = '+str(v) for k,v in state.items())+'.' for label,state in p['states'])+' '+p['result']
        passport=add('example','Примените способ к новым данным',script='Теперь самостоятельная попытка на новых данных. '+p['given']+' Показ: нажмите «Разбор задачи». Сначала предложите прогноз без листания состояний. Затем «Далее» и «Назад» позволяют проверить переходы. Полный разбор открывайте отдельной кнопкой после обсуждения. Вернитесь к условию и объясните, почему прежний ответ нельзя было перенести без проверки.',answer=solution,questions='Какое первое действие следует из условия? Что изменилось по сравнению с примером?',learning=dict(id=pid,passport=True),kicker=tag)
        models[pid]['slideId']=passport['id']
        def test(task,key):
            tid=item['id']+f'-q{qi}-t'+str(sum(s.get('task') is not None for s in lecture['slides'])+1)
            task['id']=tid
            explanation=key['explanation']
            keys[tid]=key
            if task['type']=='matching':full='\n'.join(a['text']+' → '+next(o['text'] for o in task['options'] if o['id']==key['pairs'][a['id']]) for a in task['items'])
            elif task['type']=='short':full='Допустимый ответ: '+', '.join(key['accepted'])
            else:full='; '.join(o['text'] for o in task['options'] if o['id'] in key['correct'])
            add('test',{'single':'Выберите обоснованный ответ','multiple':'Выберите верные утверждения','matching':'Сопоставьте понятия','short':'Проверьте свой результат'}[task['type']],script=task['prompt']+' Сначала запишите или выберите ответ и обоснование. Пауза на самостоятельную попытку. После проверки откройте разбор отдельной командой; сначала обсудите основание ответа, затем ошибочные предположения.',answer=full+'\n'+explanation,questions=task['prompt'],task=task,kicker=tag)
        prompt,choices=u['question']
        opts=[dict(id='o'+str(i),text=t) for i,t in enumerate(choices)]
        random.Random(item['id']+str(qi)).shuffle(opts)
        test(dict(type='single',prompt=prompt,options=opts),dict(type='single',correct=['o0'],explanation=choices[0]+'. '+u['pitfall'][1]+' '+u['pitfall'][2],optionExplanations={f'o{i}':('Верно: '+choices[0] if i==0 else 'Этот вариант не подтверждает требуемый результат. '+u['pitfall'][2]) for i in range(4)}))
        valid_actions=[a+'. '+b for a,b in detail['actions'][:2]]
        opts=[dict(id='o'+str(i),text=t) for i,t in enumerate(valid_actions)]
        opts += [dict(id='o2',text=u['pitfall'][0]),dict(id='o3',text='Считать результат достаточным без проверки исходного условия.'),dict(id='o4',text='При несовпадении результата изменить ожидание без обращения к требованию.')]
        random.Random(item['id']+str(qi)+'multi').shuffle(opts)
        test(dict(type='multiple',prompt='Выберите два действия, соответствующие разобранному порядку работы.',choose=2,options=opts),dict(type='multiple',correct=['o0','o1'],explanation='Правильные действия: '+' '.join(valid_actions)+' '+u['pitfall'][1]+' '+u['pitfall'][2]))
        short_prompt,short_answer,short_explanation=SHORT[item['id']][qi-1]
        accepted=[short_answer]
        if short_answer=='fast-forward':accepted+=['fast forward']
        short_key=dict(type='short',accepted=accepted,explanation=short_explanation)
        try:short_key['numeric']=dict(value=float(short_answer.replace(',','.')),tolerance=0)
        except ValueError:pass
        test(dict(type='short',prompt=short_prompt),short_key)
        opts=[dict(id='o'+str(i),text=b) for i,(a,b) in enumerate(terms)]
        random.Random(item['id']+str(qi)+'match').shuffle(opts)
        test(dict(type='matching',prompt='Сопоставьте каждый термин с его определением. Каждый вариант используется один раз.',items=[dict(id='i'+str(i),text=a) for i,(a,b) in enumerate(terms)],options=opts),dict(type='matching',pairs={f'i{i}':f'o{i}' for i in range(4)},explanation='\n'.join(a+' — '+b for a,b in terms)))
        ss=lecture['slides'][start:]
        coverage.append(dict(lectureId=item['id'],question=qi,title=u['title'],slideIds=[s['id'] for s in ss],exampleModel=mid,practiceModel=pid,taskIds=[s['task']['id'] for s in ss if s.get('task')],visualSlideIds=[s['id'] for s in ss if s.get('visual')],contextSlideId=ss[1]['id']))
        for term,definition in terms:course['glossary'].append(dict(term=term,definition=definition,slideIds=[ss[2]['id'] if terms.index((term,definition))<2 else ss[3]['id']]))
    # Full source and task are visible; the argument stays behind a deliberate reveal.
    final=item['units'][1]['worked']; last=item['units'][0]['changed']
    integrated='Исследуйте два наблюдения. 1. '+last['given']+' 2. '+final['given']+' Для каждого укажите правило, результат и границу вывода. Объясните, какой инструмент даст нужное свидетельство и почему одной успешной проверки недостаточно.'
    sid=item['id']+'-integrated'
    explanations[sid]=last['result']+'\n\n'+final['result']+'\n\nДля каждого вывода сохраняют вход, редакцию и условия. Метод выбирают по вопросу: значения — трасса или тест, представление — статическое исследование, время — измерение. Ограничения двух наблюдений не складываются в доказательство всех свойств продукта.'
    if item['id']=='s05-01-team-git':
        integrated='Команда оформляет заявку: API вернул id=83, но в хранилище только id=84 с тем же текстом. В Git: HEAD=1, индекс=2, рабочий файл=3; выполняется commit без add. При объединении веток настройка main=40 и feature=60 конфликтует; согласованный limit=50. Установите три результата и для каждого назовите действие, которое его проверит.'
        explanations[sid]='1. Приёмка заявки не выполнена: нужна запись id=83, совпадение текста у id=84 недостаточно. Проверить поиск по возвращённому номеру.\n\n2. Commit сохранит 2 из индекса; рабочее 3 останется отдельной правкой. Проверки: git diff --cached до фиксации и git show HEAD:calc.txt после.\n\n3. Конфликт разрешают значением limit=50 по требованию, а не привычным выбором стороны. Подготовить файл, завершить merge, проверить содержимое HEAD и сохранение двух родителей в истории.'
    add('example','Самостоятельная задача по теме',script=integrated+' Дайте группе сформулировать два вывода независимо. До попытки не показывайте разбор. Кнопка «Показать разбор» открывает пояснение для обсуждения, а не выставляет оценку свободному тексту.',answer=explanations[sid],body=integrated,practice=dict(solutionId=sid))
    audience_questions=['Какое наблюдение подтверждает ваш вывод?','Какие условия ограничивают его?','Что изменится при другой редакции, входных данных или конфигурации?']
    add('questions','Вопросы к аудитории',script='Вернёмся ко всем вопросам темы: '+ '; '.join(u['title'] for u in item['units'])+'.\n\n'+ '\n\n'.join(q+' Пауза для ответа и обоснования на конкретном примере.' for q in audience_questions),questions='\n'.join(audience_questions),bullets=audience_questions,answer=' '.join(u['worked']['result'] for u in item['units'])+' Общий принцип: вывод ограничен исследованным объектом и условиями.')
    course['lectures'].append(lecture)
    course['curriculum'].append(dict(topic=item['title'],outcome='Исследовать '+item['title'].lower()+' на заданных данных, обосновать результат и границы.',source=('Тема 03.01.1; ОК 01, ПК 3.1–ПК 3.3' if item['semester']==5 else 'Тема 03.01.2; ОК 01, ПК 3.1–ПК 3.3'),slideIds=[s['id'] for s in lecture['slides'][first:]],taskIds=[s['task']['id'] for s in lecture['slides'] if s.get('task')]))

write(root/'public/course.json',course)
write(root/'public/teacher-pack.json',dict(schemaVersion=1,courseId=course['id'],contentVersion=course['contentVersion'],notes=notes))
write(root/'public/assessment.json',dict(schemaVersion=1,courseId=course['id'],contentVersion=course['contentVersion'],keys=keys))
write(root/'public/workbenches.json',models)
write(root/'public/explanations.json',explanations)
write(root/'authoring/coverage.json',coverage)
write(root/'authoring/sources.json',dict(primary=primary,additional=additional,technical=sources))
readme=['# МДК.03.01 «Моделирование и анализ программного обеспечения»','']
for sem in [5,6]:
    readme+=['## '+str(sem)+' семестр','']
    readme += [f'{i+1}. [{l["title"]}](https://olgakraven.github.io/2026-MOAIP-lecture/?lecture={l["id"]})' for i,l in enumerate(course['lectures']) if l['semester']==sem]
    readme+=['']
(root/'README.md').write_text('\n'.join(readme),encoding='utf-8')

if args.brainm:
    dest=args.brainm/'BrainM/Проекты/Моделирование и анализ программного обеспечения'
    textdir=dest/'Тексты преподавателя'; textdir.mkdir(parents=True,exist_ok=True)
    digest=hashlib.sha256((root/'public/course.json').read_bytes()).hexdigest()
    # Provenance is kept in alignment.json, outside the educational prose.
    front=''
    teacher_all=[front+'# Моделирование и анализ программного обеспечения\n']
    presenter_all=[front+'# Сценарий преподавателя\n']; alignment=[]; index=[]
    for no,l in enumerate(course['lectures'],1):
        teacher=[front+f'# {l["title"]}\n\n{l["semester"]} семестр.\n']; presenter=[front+f'# {l["title"]}: сценарий показа\n']
        for number,s in enumerate(l['slides'],1):
            anchor=s['id']; n=notes[anchor]
            lead=f'\n<a id="{anchor}"></a>\n## Слайд {number}. {s["title"]}\n<!-- source-slides: {anchor} -->\n\n'
            explanation=n['script'].split(' Показ:')[0]
            # The teaching document contains the actual code, not only discussion.
            code=''
            if s.get('learning'):
                model=models[s['learning']['id']]
                for case in model['scenarios']:
                    if case.get('code'):code+='\n\n```text\n'+case['code']+'\n```\n'
            elif s.get('code'):code='\n\n```text\n'+s['code']+'\n```\n'
            references='\n\n'+'\n\n'.join(r['citation']+(' [Открыть источник]('+r['url']+')' if r.get('url') else '') for r in s['references']) if s.get('references') else ''
            teacher.append(lead+explanation+code+references+ ('\n\nРазбор после самостоятельной попытки:\n\n'+n['answer'] if n['answer'] else '')+'\n')
            presenter.append(lead+n['script']+code+references+ ('\n\n**Вопрос группе:** '+n['questions'] if n['questions'] else '')+ ('\n\n**Ответ и разбор после попытки:**\n\n'+n['answer'] if n['answer'] else '')+ ('\n\n**Запишите:** '+n['notebook'] if n['notebook'] else '')+'\n')
            alignment.append(dict(lectureId=l['id'],slideId=anchor,displayNumber=number,title=s['title'],anchors=dict(teacher=anchor,presenter=anchor)))
        teacher_all+=teacher[1:]; presenter_all+=presenter[1:]
        safe_title=re.sub(r'[<>"/\\|?*]', '–', l['title'].replace(':',' —'))
        filename=f'{no:02} — {safe_title}'
        (textdir/(filename+'.teacher.md')).write_text(''.join(teacher),encoding='utf-8')
        (textdir/(filename+'.presenter.md')).write_text(''.join(presenter),encoding='utf-8')
        index.append(f'- [[Проекты/Моделирование и анализ программного обеспечения/Тексты преподавателя/{filename}.teacher|{l["title"]}]]')
    (textdir/'course.teacher.md').write_text(''.join(teacher_all),encoding='utf-8')
    (textdir/'course.presenter.md').write_text(''.join(presenter_all),encoding='utf-8')
    write(textdir/'alignment.json',dict(schemaVersion=1,courseId='moaip',contentVersion=course['contentVersion'],sourceKind='local',sourceSha256=digest,lectureIds=[l['id'] for l in course['lectures']],documents=dict(teacher='course.teacher.md',presenter='course.presenter.md'),slides=alignment))
    (dest/'Лекции.md').write_text('# Моделирование и анализ программного обеспечения\n\n'+ '\n\n'.join('## '+str(sem)+' семестр\n\n'+'\n'.join(index[i] for i,l in enumerate(course['lectures']) if l['semester']==sem) for sem in [5,6])+'\n',encoding='utf-8')
print(f'{len(course["lectures"])} lectures; {len(notes)} slides; {len(models)} models; {len(keys)} tasks')
