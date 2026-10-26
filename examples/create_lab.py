from pathlib import Path
from subprocess import run
import argparse, shutil

p=argparse.ArgumentParser(description='Создать новый изолированный учебный стенд')
p.add_argument('kind',choices=['git-index','git-merge','git-bisect'])
p.add_argument('path',type=Path)
a=p.parse_args()
if a.path.exists():raise SystemExit('Каталог уже существует. Выберите новое имя; содержимое не изменялось.')
git=shutil.which('git')
if not git:raise SystemExit('Нужен установленный Git.')
origin=Path(__file__).resolve().parent
def read_config(field):
    return run([git,'config',field],cwd=origin,capture_output=True,text=True).stdout.strip()
name,email=read_config('user.name'),read_config('user.email')
if not name or not email:raise SystemExit('Сначала настройте свои user.name и user.email в Git. Учебный стенд не придумывает автора.')
a.path.mkdir(parents=True)
def call(*args):
    r=run([git,*args],cwd=a.path,capture_output=True,text=True)
    if r.returncode:raise SystemExit(r.stderr)
    return r.stdout
call('init','-q','-b','main');call('config','user.name',name);call('config','user.email',email)
if a.kind=='git-bisect':
    (a.path/'check.py').write_text('from runpy import run_path\ntotal = run_path("calc.py")["total"]\nassert total(120, 3) == 360\nprint("OK")\n',encoding='utf-8')
    for i,label in enumerate('ABCDEFGH'):
        expression='price * qty' if i<5 else 'price + qty'
        (a.path/'calc.py').write_text('def total(price, qty):\n    return '+expression+'\n',encoding='utf-8')
        (a.path/'revision.txt').write_text(label+'\n',encoding='utf-8')
        call('add','calc.py','check.py','revision.txt');call('commit','-qm','Учебная редакция '+label);call('tag',label)
    print('Создана история A–H. Тест: python check.py. Первый дефект — F.')
    raise SystemExit(0)
if a.kind=='git-merge':
    file=a.path/'settings.txt';file.write_bytes(b'limit = 10\n')
    call('add','settings.txt');call('commit','-qm','Общая настройка')
    call('switch','-qc','feature');file.write_bytes(b'limit = 20\n')
    call('add','settings.txt');call('commit','-qm','Настройка feature')
    call('switch','-q','main');file.write_bytes(b'limit = 30\n')
    call('add','settings.txt');call('commit','-qm','Настройка main')
    print('Создан стенд двух веток:',a.path.resolve())
    print('Команда git merge feature даст ожидаемый конфликт settings.txt. Требование: limit = 25.')
    raise SystemExit(0)
file=a.path/'calc.txt'
file.write_bytes(b'10\n');call('add','calc.txt');call('commit','-qm','Исходное значение')
file.write_bytes(b'20\n');call('add','calc.txt');file.write_bytes(b'30\n')
print('Создан стенд:',a.path.resolve())
print('HEAD=10; индекс=20; рабочий файл=30')
