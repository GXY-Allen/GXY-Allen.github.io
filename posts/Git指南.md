# 博客建立之路

全程Gemini母亲般的教导下，这个傻傻的人终于让自己的网站有了雏形

Gemini 3真的太好用了（无广）

## 概要

本博客是建立在GitHub Pages上的，国内的话可能需要加速器？或许？从HTML，CSS，到python的生成器，全部都是自己写的，可以很好的理解每一个过程

## 准备

为了方便管理GitHub仓库，我还是本地安装了Git。

### Git 简介 - 参考Pro Git

ref: [Git](https://git-scm.com/book/zh/v2)

#### Git是一个“版本控制工具”

1. 版本控制是一种记录一个或若干文件内容变化，以便将来查阅特
   定版本修订情况的系统

2. 版本控制工具有多种

   1. 本地：

      ![](https://raw.githubusercontent.com/GXY-Allen/images/main/2025/11/20251120130947.png)

      eg. 你创建了几个文件夹包含不同的版本

   2. 集中化：

      ![](https://raw.githubusercontent.com/GXY-Allen/images/main/2025/11/20251120131059.png)

      ​	整个项目的历史记录被保存在单一位置（中央服务器），有丢失所有历史更新记录的风险。

   3. 分布式（即Git）：

      ![](https://raw.githubusercontent.com/GXY-Allen/images/main/2025/11/20251120131318.png)

      相当于每个客户端（用户）都有一份完整的备份，许多工作本地就能够完成，只有必要时才会向服务器提交修改

3. 对于版本控制，有多种方式来记录不同的版本，以下是Git的版本记录方式：

   ![](https://raw.githubusercontent.com/GXY-Allen/images/main/2025/11/20251120131908.png)

   Git将每一个版本的所有文件都做了一个“快照”。为了效率，如果文件没有修改，Git 不再重新存储该文件，而是只保留一个链接指向之前存储的文件。

4. 在Git（版本控制系统）中，文件处于一下三种状态之一：

   1. 已修改（modified）：表示修改了文件，但还没保存到数据库中。
   2. 已暂存（staged）：表示对一个已修改文件的当前版本做了标记，使之包含在下次提交的快照中。
   3. 已提交（committed）：表示数据已经安全地保存在本地数据库中。

   由此，Git 项目拥有三个阶段：工作区、暂存区以及 Git 目录。如下

   ![](https://raw.githubusercontent.com/GXY-Allen/images/main/2025/11/20251120134106.png)

   具体来说：

   1. 工作区是对项目的某个版本独立提取出来的内容。 这些从 Git 仓库的压缩数据库中提取出来的文件，放在磁盘上供你使用或修改。

   2. 暂存区是一个文件，保存了下次将要提交的文件列表信息，一般在 Git 仓库目录中。 按照 Git 的术语叫做“索引”，不过一般说法还是叫“暂存区”。

   3. Git 仓库目录是 Git 用来保存项目的元数据和对象数据库的地方。 这是 Git 中最重要的部分，从其它计算机克隆仓库时，复制的就是这里的数据。

5. 由此，基本的 Git 工作流程如下：

   1. 在工作区中修改文件。
   2. 将你想要下次提交的更改选择性地暂存，这样只会将更改的部分添加到暂存区。
   3. 提交更新，找到暂存区的文件，将快照永久性存储到 Git 目录。

#### Git的安装

在官网（[Git - Install for Windows](https://git-scm.com/install/windows)）上下载的最新的包![](https://raw.githubusercontent.com/GXY-Allen/images/main/2025/11/20251120135439.png)

步骤（未提及的均选默认）：

1. Components这里我全选了，免得麻烦以后重新装![](https://raw.githubusercontent.com/GXY-Allen/images/main/2025/11/20251120135630.png)

2. 这里选择默认编辑器，建议不要选Vim除非你会用，我常用的是sublime text我就选的它，如果你没有常用的编辑器，就选择notepad（记事本），虽然记事本不怎么好用但不会出错![](https://raw.githubusercontent.com/GXY-Allen/images/main/2025/11/20251120135854.png)

3. 这是默认分支的命名，建议选择 **第二个选项** ，并将默认名字保持main。因为早期时候GitHub默认名为master，现在新的是main。![](https://raw.githubusercontent.com/GXY-Allen/images/main/2025/11/20251120140156.png)

4. 这是关于配置环境变量（PATH）的选项，建议第二个（即默认）。这只会将不冲突，且必须的，添加到PATH中，以便在windows的命令行工具（cmd&PowerShell）和第三方软件中使用Git命令。![](https://raw.githubusercontent.com/GXY-Allen/images/main/2025/11/20251120140452.png)注：Git是基于Linux开发的，很多命令和Windows原生有冲突和不同，所以才会出现这个问题

5. 这是关于Git连接到GitHub服务器的，在进行SSH（secure shell）连接时选择哪一个 **客户端** 程序（本地），建议第一个，免去了自己配置，第二个选项仅推荐给那些已经有自己的 SSH 客户端管理方式（例如使用 Windows 10/11 的内置 OpenSSH 或其他特定工具）的高级用户。![](https://raw.githubusercontent.com/GXY-Allen/images/main/2025/11/20251120141029.png)

6. 选择 Git 在进行 **HTTPS 连接** （例如，通过 HTTPS URL 克隆或推送代码）时，应该使用哪个 **SSL/TLS 库**来处理加密和证书验证。

   1. Git 会使用它安装包中自带的 `ca-bundle.crt` 文件（或 Git 配置指定的其他文件）来存储和查找受信任的根证书颁发机构 (Root CAs)。
   2. Git 将使用 Windows 原生的 SSL/TLS 库，也就是 Windows Secure Channel (Schannel)。这意味着它会利用 Windows 操作系统自己的证书存储区来验证服务器证书。如果您在公司网络中使用，它可以自动识别和信任通过 Active Directory Domain Services 分发的内部根 CA 证书。这对于访问公司内部的 Git 服务器非常重要。且信任的根证书列表由 Windows 系统维护和更新。
   3. 如果是自己的电脑就都可以选。

   ![](https://raw.githubusercontent.com/GXY-Allen/images/main/2025/11/20251120141853.png)

7. 因为在Linux系统下换行符是`\n`（LF）而Windows下换行符是`\r\n`（CRLF）。为了避免提交以后Windows用户和Linux用户出现冲突，Git提供了自动转换的帮助，即第一个选项。![](https://raw.githubusercontent.com/GXY-Allen/images/main/2025/11/20251120142742.png)

8. 这是 **Git 凭证管理器（Credential Helper）** 的配置。当通过 HTTPS 连接到 GitHub、GitLab 或其他代码托管平台时，需要提供用户名和密码进行身份验证。如果不使用凭证管理器， **每次** 与远程仓库交互时，Git 都会要求重新输入这些信息。![](https://raw.githubusercontent.com/GXY-Allen/images/main/2025/11/20251120143732.png)

#### Git 基本操作 - 命令行工具

在这里并不会提及Git的GUI软件，因为大多数的 GUI 软件只实现了 Git 所有功能的一个子集以降低操作难度。

1. 用户信息：

   ```
	$ git config --global user.name "xxx"
	$ git config --global user.email xxx@example.com
   ```

   如果使用了 `--global` 选项，那么该命令只需要运行一次，因为之后无论你在该系统上做任何事情， Git 都会使用那些信息。 当你想针对特定项目使用不同的用户名称与邮件地址时，可以在那个项目目录下运行没有 `--global` 选项的命令来配置。

2. 检查配置信息

   如果想要检查你的配置，可以使用 `git config --list` 命令来列出所有 Git 当时能找到的配置

3. 获取Git仓库

   1. 将尚未进行版本控制的本地目录转换为 Git 仓库

      1. 首先需要进入该项目目录中，在Windows上`$ cd /c/user/my_project`。

         更直接的办法是，在资源管理器中进入到该项目的目录，右键并选择`Open Git Bash here`

      2. 之后执行`$ git init`

      3. 如果在一个已存在文件的文件夹（而非空文件夹）中进行版本控制,可以通过 git add 命令来指定所需的文件来进行追踪，然后执行 git commit 

         ```
         $ git add *.c
         $ git add LICENSE
         $ git commit -m 'initial project version'
         ```

         稍后我们再逐一解释这些指令的行为。 现在，你已经得到了一个存在被追踪文件与初始提交的 Git 仓库。

   2. 克隆现有的仓库（在我的项目中目前不会用到，因此跳过）

4. 记录每次更新到仓库