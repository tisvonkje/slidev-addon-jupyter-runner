---
theme: default
layout: two-cols-header
class: p-2
---

# Jupyter runner for [Slidev]

::left::

# left

```python {monaco-run}{autorun:false}
import torch
print(torch.__version__)
x=torch.rand(3)
print(x)
print(torch.cuda.is_available())
```

::right::

# right

```python {monaco-run}{autorun:false}
print(x)
```

[//]: (Externals)
[Slidev]: https://sli.dev
[Coliru]: https://coliru.stacked-crooked.com
[//]: (EOF)
