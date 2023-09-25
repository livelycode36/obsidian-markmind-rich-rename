# obsidian-markmind-rich-rename

为[obsidian-markmind](https://github.com/MarkMindCkm/obsidian-markmind)的rich模式编写的插件，用于重命名文件时自动修改文件内的链接。
> 部分功能，抄[obsidian-attachment-management](https://github.com/trganda/obsidian-attachment-management)

**不是专业前端，不太会写js、ts，代码写的很烂，但是能用。**

支持：
- `[[文件名(扩展名)]]`、`![[文件名(扩展名)]]`、`[[文件夹/文件名(扩展名)]]`
- `[[文件名#123]]`、`[[文件名#^123]]`
- 标准markdown链接：`[名称](地址)`、`![名称](地址)`
- markmind中的节点链接

不支持如下情况：
用户有唯一笔记`123`在目录`abc/123.md`，当用户在笔记中有链接`[[123]]`，ob会唯一指定在目录`abc/123.md`的笔记。
而，用户又产生一篇笔记`123`在目录`efg/123.md`，此时ob会让用户选择
1. 用户选择更新链接：因为笔记`123`在系统中，`不是唯一`所以，会将之前的链接`[[123]]`更新为`[[abc/123]]`，让链接的笔记具有唯一性
2. 用户选择不更新链接：之前的链接`[[123]]`不变，但是会指向不明确

因为用户可以选择更新、不更新，所以，不支持这种情况。

<b style="color: red"> 还未充分大规模验证，会有bug，且更新链接会直接修改笔记，请创建新库进行测试 </b>
