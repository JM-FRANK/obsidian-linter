---
title: Calc_L3、洛必达、泰勒展开、不定积分、换元积分
created: 2026-04-26
type: lecture-note
tags:
  - math
  - calculus
  - limit
  - derivative
  - lhopital
  - taylor
  - maclaurin
  - integral
  - substitution
---
# 1 洛必达法则
## 1.1 未定式

当极限出现以下形式时，称为**未定式**：
- $\dfrac{0}{0}$ 型
- $\dfrac{\infty}{\infty}$ 型
这两类形式不能直接代入求值，需要进一步变形或使用洛必达法则。
## 1.2 洛必达法则的基本形式

设 $x\to a$ 时，$f(x)$ 与 $g(x)$ 均趋于 $0$，或均趋于无穷大。若在 $a$ 的某去心邻域内 $f'(x),g'(x)$ 存在，且 $g'(x)\ne 0$，并且 $\lim_{x\to a}\frac{f'(x)}{g'(x)}$ 存在或为无穷大，则
$$
\lim_{x\to a}\frac{f(x)}{g(x)}
=
\lim_{x\to a}\frac{f'(x)}{g'(x)}.
$$
类似地，当 $x\to\infty$ 或 $x\to-\infty$ 时也可以使用。

> [!proof] 洛必达法则推导
> 1. 当 $x \to a$ 时， $f(x) \to 0 \, \text{且} \, F(x) \to 0$
> 2. 在 $\mathbb{R}$ ，$f'(x)$ 与 $F'(x)$ 都存在且 $F'(x) \neq 0$
> 3. $\lim_{x \to a} \displaystyle \frac{f'(x)}{F'(x)} = L$ 存在
> 4. 根据柯西中值定理。在区间 $[a, x]$（或 $[x, a]$）上，由于 $f$ 和 $F$ 满足连续且可导的条件，所以存在一个点 $\xi$ 介于 $a$ 与 $x$ 之间，使得：$\frac{f(x) - f(a)}{F(x) - F(a)} = \frac{f'(\xi)}{F'(\xi)}$
> 5. 将 $f(a) = 0$ 和 $F(a) = 0$ 代入上式，得：$\displaystyle \frac{f(x)}{F(x)} = \frac{f'(\xi)}{F'(\xi)}$
> 6. 当 $x \to a$ 时，由于 $\xi$ 被夹在 $x$ 与 $a$ 之间，根据夹逼定理可知 $\xi \to a$。因此：$\displaystyle \lim_{x \to a} \frac{f(x)}{F(x)} = \lim_{\xi \to a} \frac{f'(\xi)}{F'(\xi)}$
> 7. 所以 $\displaystyle \lim_{x \to a} \frac{f(x)}{F(x)} = \lim_{x \to a} \frac{f'(\xi)}{F'(\xi)} = L$
## 1.3 使用步骤

1. 先判断原式是否为 $\dfrac{0}{0}$ 或 $\dfrac{\infty}{\infty}$ 型。
2. 若满足条件，则分子分母分别求导。
3. 再代入极限。
4. 若仍然是 $\dfrac{0}{0}$ 或 $\dfrac{\infty}{\infty}$ 型，可以继续使用。
5. 若不再是未定式，立即停止。

> [!important] 使用条件
> 只有在 $\dfrac{0}{0}$ 或 $\dfrac{\infty}{\infty}$ 型时，才可以直接使用洛必达法则。  
> 如果求导一次后已经不再是未定式，就应该停止，不能继续机械求导。

## 1.4 例题
### 1.4.1 三角函数

> [!eg] 求极限： $\displaystyle \lim_{x\to 0}\frac{\sin bx}{\sin ax}\quad (a\ne 0)$
> 因为当 $x\to 0$ 时，分子与分母均趋于 $0$，所以是 $\dfrac{0}{0}$ 型。
> 使用洛必达法则：
> $$
> \lim_{x\to 0}\frac{\sin bx}{\sin ax}
> =
> \lim_{x\to 0}\frac{b\cos bx}{a\cos ax}
> =
> \frac{b}{a}.
> $$

> [!eg] 求极限： $\displaystyle \lim_{x\to \frac{\pi}{2}}(\sec x-\tan x)$
> 因为当 $x\to \dfrac{\pi}{2}$ 时，$\sec x\to \infty$，$\tan x\to \infty$，所以是 $\infty-\infty$ 型。
> 先转化为分式：
> $$
> \begin{aligned}
> \sec x-\tan x
> &= \frac{1}{\cos x}-\frac{\sin x}{\cos x} \\
> &= \frac{1-\sin x}{\cos x}.
> \end{aligned}
> $$
> 当 $x\to \dfrac{\pi}{2}$ 时，分子与分母均趋于 $0$，所以是 $\dfrac{0}{0}$ 型。
> 使用洛必达法则：
> $$
> \begin{aligned}
> \lim_{x\to \frac{\pi}{2}}(\sec x-\tan x)
> &= \lim_{x\to \frac{\pi}{2}}\frac{1-\sin x}{\cos x} \\
> &= \lim_{x\to \frac{\pi}{2}}\frac{-\cos x}{-\sin x} \\
> &= \lim_{x\to \frac{\pi}{2}}\frac{\cos x}{\sin x} \\
> &= \frac{0}{1} \\
> &= 0.
> \end{aligned}
> $$

### 1.4.2 多次洛必达

> [!eg] 题目
> $$
> \lim_{x\to 1}\frac{x^3-3x+2}{x^3-x^2-x+1}
> $$
> 直接代入：
> $$
> \frac{1-3+2}{1-1-1+1}=\frac{0}{0}.
> $$
> 第一次使用洛必达法则：
> $$
> \lim_{x\to 1}\frac{3x^2-3}{3x^2-2x-1}.
> $$
> 继续代入仍为 $\dfrac{0}{0}$，所以再用一次：
> $$
> \lim_{x\to 1}\frac{6x}{6x-2}
> =
> \frac{6}{4}
> =
> \frac{3}{2}.
> $$
> 

### 1.4.3 对数与幂函数增长速度

> [!eg] 题目
> $$
> \lim_{x\to\infty}\frac{\ln x}{x^n}\quad (n>0)
> $$
> 当 $x\to\infty$ 时，分子与分母均趋于无穷大，是 $\dfrac{\infty}{\infty}$ 型。
> 使用洛必达法则：
> $$
> \lim_{x\to\infty}\frac{\ln x}{x^n}
> =
> \lim_{x\to\infty}\frac{1/x}{n x^{n-1}}
> =
> \lim_{x\to\infty}\frac{1}{n x^n}
> =
> 0.
> $$

### 1.4.4 将非标准未定式转化为标准形式

> [!eg] 求极限 $x^n\ln x\quad (x\to 0^+).$
>  此时是 $0\cdot(-\infty)$ 型，不能直接使用洛必达法则。可以将其改写为分式：
>  $$
> x^n\ln x = \frac{\ln x}{x^{-n}}.
> $$
> 这样就转化为 $\dfrac{-\infty}{\infty}$ 型，可以继续使用洛必达法则。

> [!important] 思路
> 遇到 $0\cdot\infty$、$\infty-\infty$ 等形式时，先通过通分、取倒数、因式分解等方式，将它转化为 $\dfrac{0}{0}$ 或 $\dfrac{\infty}{\infty}$ 型。

# 2 泰勒展开与麦克劳林展开
## 2.1 展开的直观意义

泰勒展开（Taylor expansion）的本质是：  
用多项式逐项修正原函数，使多项式在某一点附近越来越接近原函数。
例如 $e^x$ 在 $x=0$ 附近可以先近似为 $e^x\approx 1+x$ 。
如果需要更高精度，则继续加入二次项、三次项：
$$
e^x\approx 1+x+\frac{x^2}{2!}+\frac{x^3}{3!}
$$

> [!info] 与等价无穷小的关系
> 等价无穷小可以看作低阶泰勒展开的结果。  
> 例如 $\sin x\sim x$ 就来自
> $$
> \sin x=x-\frac{x^3}{3!}+\cdots.
> $$

## 2.2 泰勒展开公式

若函数 $f(x)$ 在 $x_0$ 附近具有足够阶导数，则在 $x_0$ 附近有
$$
f(x)
=
f(x_0)
+
f'(x_0)(x-x_0)
+
\frac{f''(x_0)}{2!}(x-x_0)^2
+
\cdots
+
\frac{f^{(n)}(x_0)}{n!}(x-x_0)^n
+
R_n(x).
$$
其中 $R_n(x)$ 为余项。

> [!note] 考试处理
> 一般计算题更关注前几项展开。若题目没有要求严格估计误差，通常只需按公式展开到指定阶数。

## 2.3 麦克劳林展开

麦克劳林展开（Maclaurin expansion）是泰勒展开在 $x_0=0$ 处的特殊情形：
$$
f(x)
=
f(0)
+
f'(0)x
+
\frac{f''(0)}{2!}x^2
+
\cdots
+
\frac{f^{(n)}(0)}{n!}x^n
+
R_n(x).
$$

> [!important] 区别
> - 泰勒展开：在任意点 $x=x_0$ 附近展开。
> - 麦克劳林展开：在 $x=0$ 附近展开。

## 2.4 常见麦克劳林展开

### 2.4.1 指数函数

因为 $f(x)=e^x$ 的任意阶导数仍为 $e^x$，且
$$
f^{(n)}(0)=1,
$$
所以
$$
e^x = 1+x+\frac{x^2}{2!}+\frac{x^3}{3!}+\cdots+\frac{x^n}{n!}+\cdots.
$$

### 2.4.2 三角函数

$$
\begin{aligned}
\sin x = x-\frac{x^3}{3!}+\frac{x^5}{5!}-\frac{x^7}{7!}+\cdots.	\\
\cos x = 1-\frac{x^2}{2!}+\frac{x^4}{4!}-\frac{x^6}{6!}+\cdots.
\end{aligned}
$$

### 2.4.3 对数函数

$$
\ln(1+x) = x-\frac{x^2}{2}+\frac{x^3}{3}-\frac{x^4}{4}+\cdots
\quad (|x|<1).
$$

### 2.4.4 几何级数型

$$
\frac{1}{1-x} = 1+x+x^2+x^3+\cdots
\quad (|x|<1).
$$

# 3 不定积分

## 3.1 原函数

若函数 $F(x)$ 满足 $F'(x)=f(x),$ 则称 $F(x)$ 是 $f(x)$ 的一个*原函数*。由于常数项求导后为 $0$，所以若 $F(x)$ 是 $f(x)$ 的一个原函数，则
$$
F(x)+C
$$
也是 $f(x)$ 的原函数。

## 3.2 不定积分的定义

函数 $f(x)$ 的不定积分定义为所有原函数的集合，记作
$$
\int f(x)\,dx=F(x)+C.
$$

其中：

- $\int$ 是积分号；
- $f(x)$ 是被积函数；
- $dx$ 表示积分变量；
- $C$ 是任意常数。

> [!important] 一定要加 $C$
> 不定积分的结果不是某一个唯一函数，而是一族函数，所以最后必须写 $+C$。

## 3.3 积分与导数的关系

积分是导数的逆运算：
$$
\left(\int f(x)\,dx\right)'=f(x),
$$
并且
$$
dF(x)=F'(x)\,dx=f(x)\,dx.
$$

> [!info] 直观理解
> 求导是把函数“拆开”看瞬时变化率；积分则是把微小变化“一点一点拼回去”。

## 3.4 不定积分的线性性质

若 $\int f(x)\,dx$ 与 $\int g(x)\,dx$ 存在，则
$$
\int [f(x)+g(x)]\,dx
=
\int f(x)\,dx+\int g(x)\,dx,
$$
$$
\int kf(x)\,dx
=
k\int f(x)\,dx.
$$

# 4 基本积分公式
## 4.1 幂函数与常数

$$
\begin{aligned}
\int 0\,dx &= C, \\
\int k\,dx &= kx+C, \\
\int x^\alpha\,dx
&= \frac{x^{\alpha+1}}{\alpha+1}+C
\quad (\alpha\ne -1), \\
\int \frac{1}{x}\,dx
&= \ln|x|+C.
\end{aligned}
$$

## 4.2 指数函数

$$
\begin{aligned}
\int e^x\,dx &= e^x+C, \\
\int a^x\,dx
&= \frac{a^x}{\ln a}+C
\quad (a>0,\ a\ne 1).
\end{aligned}
$$

## 4.3 三角函数

$$
\begin{aligned}
\int \sin x\,dx &= -\cos x+C, \\
\int \cos x\,dx &= \sin x+C, \\
\int \sec^2 x\,dx &= \tan x+C, \\
\int \csc^2 x\,dx &= -\cot x+C, \\
\int \sec x\tan x\,dx &= \sec x+C, \\
\int \csc x\cot x\,dx &= -\csc x+C.
\end{aligned}
$$

## 4.4 反三角函数相关

$$
\begin{aligned}
\int \frac{1}{\sqrt{1-x^2}}\,dx
&= \arcsin x+C, \\
\int \frac{1}{1+x^2}\,dx
&= \arctan x+C, \\
\int \frac{1}{a^2+x^2}\,dx
&= \frac{1}{a}\arctan\frac{x}{a}+C
\quad (a>0).
\end{aligned}
$$

## 4.5 常见补充公式

$$
\begin{aligned}
\int \frac{1}{\sqrt{x^2+a^2}}\,dx
&= \ln\left|x+\sqrt{x^2+a^2}\right|+C, \\
\int \frac{1}{\sqrt{x^2-a^2}}\,dx
&= \ln\left|x+\sqrt{x^2-a^2}\right|+C, \\
\int \sec x\,dx
&= \ln|\sec x+\tan x|+C.
\end{aligned}
$$

> [!tip] 记忆方式
> 积分表本质上是求导表的反向使用。  
> 熟练掌握求导表后，很多基本积分可以通过“什么函数求导等于它”反推出来。

# 5 第一类换元积分法

## 5.1 核心思想
第一类换元积分法本质上是**复合函数求导的逆运算**。若
$$
F'(u)=f(u),\qquad u=\varphi(x),
$$
则
$$
dF(\varphi(x)) = f(\varphi(x))\varphi'(x)\,dx.
$$
因此
$$
\int f(\varphi(x))\varphi'(x)\,dx = F(\varphi(x))+C.
$$
令
$$
u=\varphi(x),\qquad du=\varphi'(x)\,dx,
$$
则
$$
\int f(\varphi(x))\varphi'(x)\,dx = \int f(u)\,du.
$$

## 5.2 使用步骤
1. 找到被积函数中的“内层函数”。
2. 令 $u=$ 内层函数。
3. 求出 $du$，检查原式中是否含有对应的 $\varphi'(x)\,dx$。
4. 将原积分改写为关于 $u$ 的积分。
5. 积分后将 $u$ 换回 $x$。
## 5.3 常见形式
$$
\begin{aligned}
&\int f(ax+b)\,dx = \frac{1}{a}F(ax+b)+C \quad (a\ne 0). \\
&\int f(x^m)\,x^{m-1}\,dx = \frac{1}{m}F(x^m)+C \quad (m\ne 0). \\
&\int f(\sin x)\cos x\,dx = F(\sin x)+C. \\
&\int f(\cos x)\sin x\,dx = -F(\cos x)+C. \\
&\int f(\tan x)\sec^2 x\,dx = F(\tan x)+C.
\end{aligned}
$$

# 6 三角恒等变形与积分

## 6.1 三角函数幂次积分
三角函数的高次幂积分常通过恒等变形降次。
常用公式：
$$
\sin^2 x=\frac{1-\cos 2x}{2},
\qquad
\cos^2 x=\frac{1+\cos 2x}{2}.
$$

> [!eg] 求 $\int \cos^2 x\,dx$
> 使用降幂公式： $\displaystyle \cos^2 x=\frac{1+\cos 2x}{2}.$
> 因此
> $$
> \int \cos^2 x\,dx = \frac{1}{2}\int 1\,dx + \frac{1}{2}\int \cos 2x\,dx = \frac{x}{2} + \frac{\sin 2x}{4} + C.
> $$
## 6.2 积化和差
当被积函数是两个三角函数的乘积时，常使用积化和差公式。
$$
\begin{aligned}
\sin A\cos B = \frac{1}{2}[\sin(A+B)+\sin(A-B)] \\
\cos A\cos B = \frac{1}{2}[\cos(A+B)+\cos(A-B)] \\
\sin A\sin B = \frac{1}{2}[\cos(A-B)-\cos(A+B)]
\end{aligned}
$$

> [!tip] 积分中的原则
> 乘法通常比加减法麻烦。  
> 三角函数乘积积分中，优先考虑把乘积化为和差。

> [!eg] 求 $\int \cos 3x\cos 2x\,dx$
> $$
> \begin{aligned}
> \cos A\cos B &= \frac{1}{2}[\cos(A+B)+\cos(A-B)] \\
> \cos 3x\cos 2x &= \frac{1}{2}(\cos 5x+\cos x). \\
> \int \cos 3x\cos 2x\,dx &= \frac{1}{2}\int(\cos 5x+\cos x)\,dx \\
> &= \frac{1}{10}\sin 5x+\frac{1}{2}\sin x+C.
> \end{aligned}
> $$
> 

# 7 第二类换元积分法：三角换元
## 7.1 使用场景
当积分中出现以下根式结构时，常考虑三角换元：

| 根式结构 | 常用换元 |
|---|---|
| $\sqrt{a^2-x^2}$ | $x=a\sin t$ |
| $\sqrt{a^2+x^2}$ | $x=a\tan t$ |
| $\sqrt{x^2-a^2}$ | $x=a\sec t$ |

> [!important] 核心目的
> 三角换元的目的不是为了“换得更复杂”，而是利用三角恒等式消去根号。

> [!eg] 例题：求 $\displaystyle \int \frac{1}{\sqrt{a^2+x^2}}\,dx \quad (a>0)$
> 令 $x=a\tan\theta$，则
> $$
> \begin{aligned}
> dx=a\sec^2\theta \, d\theta,&\qquad \sqrt{a^2+x^2}=a\sec\theta \\
> \because \int \frac{1}{a\sec\theta}\cdot a\sec^2\theta \, d\theta =\int \sec\theta\,d\theta &=\int \csc\left(\theta+\frac{\pi}{2}\right)\,d\left(\theta+\frac{\pi}{2}\right) \\
> \because \int \csc\alpha\,d\alpha &= \int \frac{d\alpha}{2\sin\frac{\alpha}{2}\cos\frac{\alpha}{2}} \\
> &=\int \frac{d\left(\frac{\alpha}{2}\right)}  
> {\tan\frac{\alpha}{2}\cos^2\frac{\alpha}{2}} \\
> &= \int \frac{d\left(\tan\frac{\alpha}{2}\right)}{\tan\frac{\alpha}{2}} \\
> &= \ln\left|\tan\frac{\alpha}{2}\right|+C \\
> &= \ln|\csc\alpha-\cot\alpha|+C \\
> \therefore \int \sec\theta\,d\theta &= \ln|\sec\theta+\tan\theta|+C
> \end{aligned}
> $$
> 代回 $x=a\tan\theta$ 得
> $$
> \begin{aligned}
> \tan\theta=\frac{x}{a},\qquad \sec\theta=\frac{\sqrt{a^2+x^2}}{a} \\
> \int \frac{1}{\sqrt{a^2+x^2}}\,dx =\ln\left|\frac{\sqrt{a^2+x^2}}{a}+\frac{x}{a}\right|+C
> \end{aligned}
> $$
> 由于 $a>0$，可将常数项并入 $C$，最终得到
> $$
> \boxed{\int \frac{1}{\sqrt{a^2+x^2}}\,dx
> =\ln\left|x+\sqrt{a^2+x^2}\right|+C}
> $$
# 8 本节易错点整理

## 8.1 洛必达法则

- 没判断未定式就直接求导。
- 已经不是 $\dfrac{0}{0}$ 或 $\dfrac{\infty}{\infty}$ 型，还继续机械使用洛必达法则。
- 对复合函数求导时漏掉内层导数。
- 遇到 $0\cdot\infty$ 或 $\infty-\infty$ 时，不先转化形式。

## 8.2 泰勒展开

- 把泰勒展开和麦克劳林展开混在一起。
- 在 $x=a$ 附近近似，却误用 $x=0$ 处的麦克劳林展开。
- 展开项数不够，导致极限中关键项被省略。
- 忘记阶乘分母。

## 8.3 不定积分

- 最后忘记写 $+C$。
- 将 $\int x^\alpha dx$ 的公式误用于 $\alpha=-1$。
- 把 $\int \frac{1}{x}dx$ 写成 $\ln x+C$，忽略定义域时应写 $\ln|x|+C$。
- 换元时只换了函数，没有换 $dx$。
- 三角换元后忘记换回 $x$。

# 9 本节知识结构

```text
Calc_L3
├── 洛必达法则
│   ├── 0/0 型
│   ├── ∞/∞ 型
│   └── 非标准未定式先转化
├── 泰勒展开
│   ├── 一般泰勒展开
│   ├── 麦克劳林展开
│   └── 常见函数展开
├── 不定积分
│   ├── 原函数
│   ├── 积分是求导的逆运算
│   ├── 基本积分表
│   └── 线性性质
└── 换元积分
    ├── 第一类换元：复合函数求导的逆运算
    ├── 三角恒等变形
    └── 第二类换元：三角换元
```

# 10 修正说明（Correction Log）

- 将语音转文字中的口语化表达、课堂插话和重复内容整理为正式学习笔记。
- 根据课件内容补全洛必达法则、泰勒展开、不定积分、换元积分的公式结构。
- 将参考笔记中空缺的 `type` 与较少的 `tags` 扩展为适合 Obsidian 检索的属性。
- 保持参考笔记的层级编号、公式排版、Obsidian callout 与“定义—性质—例题—易错点”的组织方式。
- 对语音转写中明显识别错误的词语进行数学语义修正，如“诺必达/洛比达”统一为“洛必达”，“展开”统一为“泰勒展开/麦克劳林展开”。
