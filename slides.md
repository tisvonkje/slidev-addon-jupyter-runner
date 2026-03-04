---
theme: default
layout: two-cols-header
class: p-2

# C configuration using default settings
c:
  # Compiler to use.
  compiler: 'gcc'

  # C standard.
  standard: 'c2x'

  # Optimization level.
  optimization: 'O2'

  # Compiler flags.
  flags: '-Wall -Wextra -pedantic -pthread -pedantic-errors'

  # Libraries to link.
  libraries: '-lm -latomic'

  # Additional shell commands to run after compilation.
  extraCommands: ''

  # Whether to always show the compiler output.
  alwaysShowCompilerOutput: true

# C++ configuration using default settings
cpp:
  # Compiler to use.
  compiler: 'g++'

  # C++ standard.
  standard: 'c++20'

  # Optimization level.
  optimization: 'O2'

  # Compiler flags.
  flags: '-Wall -Wextra -pedantic -pthread -pedantic-errors'

  # Libraries to link.
  libraries: '-lm -latomic'

  # Additional shell commands to run after compilation.
  extraCommands: ''

  # Whether to always show the compiler output.
  alwaysShowCompilerOutput: false
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
print(a)
```

[//]: (Externals)
[Slidev]: https://sli.dev
[Coliru]: https://coliru.stacked-crooked.com
[//]: (EOF)
