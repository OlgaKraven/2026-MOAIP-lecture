from pathlib import Path
from tempfile import TemporaryDirectory
from subprocess import run
import json, shutil, sys
import xml.etree.ElementTree as ET

here=Path(__file__).resolve().parent
sys.path.insert(0,str(here))
from code_analysis import reserve,positive_sum
out=[]
def check(name,actual,expected):
    if actual!=expected:raise AssertionError(f'{name}: {actual!r} != {expected!r}')
    out.append(dict(name=name,actual=actual,expected=expected,status='passed'))
def command(args,cwd):
    r=run(args,cwd=cwd,text=True,capture_output=True)
    if r.returncode:raise RuntimeError(r.stderr)
    return r.stdout.strip()
check('reserve success',reserve(2,5),3)
check('reserve insufficient',reserve(6,5),5)
check('reserve zero',reserve(0,7),7)
check('reserve negative',reserve(-1,7),7)
for values,expected in [([3,-2,4],7),([0,-2,4],4),([5,-1,2,0],7),([],0)]:
    check('positive sum '+str(values),positive_sum(values),expected)
check('total counterexample',120*3,360)
check('total transfer',15*4,60)
check('mean base',sum([100,120,140])/3,120)
check('mean outlier',sum([100,120,140,1000])/4,340)
check('mean transfer',sum([40,50,60,50])/4,50)
check('throughput comparison',1000/1/(1000/2),2)
check('throughput transfer',600/2,300)
check('weighted A',round(.6*5+.4*2,8),3.8)
check('weighted B',round(.6*3+.4*4,8),3.4)
check('changed A',round(.3*5+.7*2,8),2.9)
check('changed B',round(.3*3+.7*4,8),3.7)
check('weighted transfer',.25*4+.75*3,3.25)
check('line coverage',8/10*100,80)
check('branch coverage',3/4*100,75)
check('permission group',int('640',8)>>3&7,4)
check('permission owner',int('640',8)>>6&7,6)
check('permission other',int('750',8)&7,0)
with TemporaryDirectory(prefix='moaip-check-') as tmp:
    tmp=Path(tmp)
    git=shutil.which('git')
    if git:
        command([git,'init','-q'],tmp)
        name=run([git,'config','user.name'],cwd=here,text=True,capture_output=True).stdout.strip()
        email=run([git,'config','user.email'],cwd=here,text=True,capture_output=True).stdout.strip()
        if name and email:
            command([git,'config','user.name',name],tmp)
            command([git,'config','user.email',email],tmp)
        ident=run([git,'var','GIT_AUTHOR_IDENT'],cwd=tmp,text=True,capture_output=True)
        if ident.returncode==0:
            f=tmp/'calc.txt';f.write_text('1\n',encoding='utf-8')
            command([git,'add','calc.txt'],tmp);command([git,'commit','-qm','Исходное значение'],tmp)
            f.write_text('2\n',encoding='utf-8');command([git,'add','calc.txt'],tmp)
            f.write_text('3\n',encoding='utf-8')
            check('actual Git index',command([git,'show',':calc.txt'],tmp),'2')
            command([git,'commit','-qm','Изменить подготовленное значение'],tmp)
            check('actual Git commit',command([git,'show','HEAD:calc.txt'],tmp),'2')
            check('actual Git working tree',f.read_text().strip(),'3')
        else:out.append(dict(name='Git index',status='not-run',reason='No configured user identity'))
    for tool,src,args,expected in [
        ('gcc','macro.c',[], '5 9 11'),('g++','sample.cpp',[], '7')]:
        compiler=shutil.which(tool)
        if compiler:
            binary=tmp/('demo.exe' if sys.platform=='win32' else 'demo')
            command([compiler,str(here/src),'-o',str(binary)],tmp)
            check('actual '+src,command([str(binary)],tmp),expected)
        else:out.append(dict(name=src,status='not-run',reason=tool+' not installed'))
    if shutil.which('gcc'):
        feature=command(['gcc','-E','-DFEATURE=1',str(here/'feature.c')],tmp)
        check('preprocessor feature 1','return 10;' in feature and 'return 20;' not in feature,True)
        feature=command(['gcc','-E','-DFEATURE=0',str(here/'feature.c')],tmp)
        check('preprocessor feature 0','return 20;' in feature and 'return 10;' not in feature,True)
    if shutil.which('g++'):
        binary=tmp/('cdt.exe' if sys.platform=='win32' else 'cdt')
        command(['g++','-I'+str(here/'cdt-project/include'),str(here/'cdt-project/src/main.cpp'),'-o',str(binary)],tmp)
        check('CDT project command line',command([str(binary)],tmp),'5')
    if shutil.which('javac') and shutil.which('java') and shutil.which('javap'):
        command(['javac','-g','-d',str(tmp),str(here/'Sample.java')],tmp)
        check('actual Java output',command(['java','-cp',str(tmp),'Sample'],tmp),'5')
        bytecode=command(['javap','-classpath',str(tmp),'-c','Sample'],tmp)
        for instruction in ['iload_0','iload_1','iadd','isub','ireturn']:check('javap '+instruction,instruction in bytecode,True)
    else:out.append(dict(name='JDK',status='not-run',reason='Full JDK not installed'))
    if shutil.which('mvn'):
        project=tmp/'java-review';shutil.copytree(here/'java-review',project,ignore=shutil.ignore_patterns('target'))
        defective=run(['mvn','-q','test'],cwd=project,text=True,capture_output=True)
        check('Maven defective exit',defective.returncode!=0,True)
        report=ET.parse(project/'target/surefire-reports/TEST-edu.moaip.CalculatorTest.xml').getroot()
        check('Maven defective count',report.get('tests'),'5')
        check('Maven defective failures',report.get('failures'),'1')
        file=project/'src/main/java/edu/moaip/Calculator.java'
        file.write_text(file.read_text(encoding='utf-8').replace('return a + 3','return a + b'),encoding='utf-8')
        command(['mvn','-q','test'],project)
        fixed=ET.parse(project/'target/surefire-reports/TEST-edu.moaip.CalculatorTest.xml').getroot()
        check('Maven fixed failures',fixed.get('failures'),'0')
    else:out.append(dict(name='Maven',status='not-run',reason='Maven not installed'))
if len(sys.argv)>1:
    dest=Path(sys.argv[1]);dest.parent.mkdir(parents=True,exist_ok=True)
    dest.write_text(json.dumps(out,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(out,ensure_ascii=False))
