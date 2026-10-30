// ==UserScript==
// @name         klingo (testes)
// @namespace    http://tampermonkey.net/klingo-testes
// @version      1.70
// @description  🐒
// @match        https://*.klingo.app/*
// @updateURL    https://raw.githubusercontent.com/mtialison/klingo/testes-codex/klingo.test.user.js
// @downloadURL  https://raw.githubusercontent.com/mtialison/klingo/testes-codex/klingo.test.user.js
// @author       alison
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_addValueChangeListener
// @grant        GM_info
// @run-at       document-idle
// ==/UserScript==

const TM_LOGIN_ICON_DATA = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAylElEQVR4nOydC1QUR7rHq3kJA6jACCICifjAXBOTkIcog5p4NUaNgWRv3GTcPNgLvpJo1JgLSbzqjoc1McAmGsF9qMx1417Ft1FEjMxFjBEXzaooIjpRRAFBeYgP7HuKSDIO/ajurp4ZmO93jkemu6q6Zrq+f331VXW1CwIAwGkBAQAAJwYEAACcGBAAAHBiQAAAwIkBAQAAJwYEAACcGBAAAHBi3OxdATVgWTbx+PHjaPXq1aihoUEXERGhb2hoQOXl5aimpgbV1dWhxsZGdO/evbb0d+7csXeVATvg7u7e9r+Liwvy8fFBfn5+SKvVov79+7d9Li8vN/bo0cOUkJCAHnvsMcQwTJa960wbxt4VUArLspG7d+/2Li4u1gUGBuq3bt2Krl69GnXr1i108+bNtn/thg4AUsDC4OXl1favW7duKCgoqHjy5MnoypUrxqioKNMLL7zQxDBMqb3rqYROKwAsy+qLiop0a9eujT937py2rKwM3b59297VApwADw8PNGDAABQREVHz5ptv5gwbNszEMIzR3vWSQ6cSAJZldRkZGYlVVVX63bt3456eKB/DMO35ec8Bzg1X2yAlKCgIRUdHmxsbGw1r1649xTCMiWrlVMThWz/LsmGLFy/u5enpmbJjxw5dZWWlFrv1fGCDxjcTDBugTXu74hMLPFQICQmpmThxoqmlpcXwySefVDMMY7Z5RSXg0FZSW1ubnJGRMTU3Nzfy4sWLgmN5qYbPlU6oFwBB6ToItRMST0BMCFxcXFDfvn3RCy+8UPr+++9n+/n5LVVcaZVwyFZ9+fJl3apVqwo2bNiAbty4IZhWyDAtXX8wYEAKlm2GdHjAlc7Pzw+99tpraObMmbEBAQEONzRwKKvYt29f1KFDh1I2btyoq6mp0ba2tnKmEzNmqcYupOZyywQcE7ljfbFeX6hs7BEEBgbWvPLKK6YRI0YYRo0aVSyrEirgEK0aj/O///77lMWLFyf+61//Qnfv3uVMx2eEJIIA7j3Ah5IAIF9eruPu7u7o0UcfRQaDIeuxxx4zOEJ8wO4tv6KiIjEjIyNly5YtYVzTeDSMXqmBS40XAPZBybieD9KYAN9xrs7H09MTvfzyy+b333/fEB4ebtfFRXYTgMbGRs2hQ4cMBoNh9tmzZxGXu891Q2m7/1x5rW+YkoZlD++CtMFb101uPlug5Lfmu59yhEGOIHAJgZubGxo4cCBKTk5Oj4mJSfHw8GiWXBkK2EUAWJbVLVy4cM62bdvi+ObyrW8mSaMjTQPrAYB2LL1Err/F8vGd4yqDK09QUBCaNGnS5kWLFqXZY/2AzVs9Nv533nmnIC8v74FeX2gaT+4wQKxcWwHiogx7DreUDAH4zlt/xt7A2LFj0erVq2NtLQI2a5ksy2rXrl2r27x5c1ZxcbHWek6ftuHLSUszL+B4qB0LEEonJgIuLi7oqaeeqhk3bpx++vTpe2RXVCI2a+ElJSUF8+fP1504caJjJQjdfZI5f1LAuAEuaPT4fOlIhgQPP/xwzfLly3OGDRuWRHQRhahuBbjn379/f867776rq6ur61gBAuNXGvhTy9g7UxDNGVBrqCBnvM+VjystVz6tVosyMjJMo0aNimcYpkbxFxBA1ZaIjf9///d/jcuXLx/3008/PXhhQkOX2+vTMjKhgJBcAQCEkXvvhIK7NO6NlDl/vjSkIhAaGormzZu359VXX9WrKQKqCsC+ffsKPvroI92lS5cevKiMXp9kXl/KcwDWZVneBOihuzZc91qKQMgVAlIvoZ2+ffuizz77zDRy5MhY4spJRLWWfvDgwcykpKTE2trajhe1MDApxixneIA4ZgLsPSsAOCZcHYzc6UASY+c6Zv05ICAA/fnPf8569tlnVYkJqGIFq1evHrdu3TpjeXm59oGLifT8Unt20geBSNKLAYLR+aAV9VeyLkCO0Vt/HjBgQE1SUpL+9ddfpz47QH1TUJZldbt27RI0fvy3EuPnys+Xvj2tXANWkhewL0ruPV9eoXYnZQgqlNf6fFlZmXbz5s1GbFsSvgIRVAUAVzAhIaHg8OHDWin5pBg5rRWByOom8/0DugZK77OYkQqlkzOctT5fVFSkTUpKKqAtAtQEoKWlRZOamjonLy+vg/vU/mVIFVVqry/lPBg3wIWUtiE3iE3qTXCdv3fvHtq9ezf64osv5rAsqxHMKAFqAmAymQzffPNNHN+jvFzIUV7a5wGACxJBEAsqkwxTpcTFsG0Zjca4/fv3GyR+HV6oWIbZbE5MSEjItF7lJ+WLiqW3TicWyQejB2gjZzMQrnNSA4PW54YMGYLWrFmT1KdPH8WPEit+MQjLsmFz585NKS19cHt0JcZPcE3FZTganbnuSuhMi6eEpgetvQGhWQS+GSqhBWeW57CtffHFFyksy+5WuqmI4lZ3+vTpzBdffDHRcqdeUuMX6snlulQ0cVaj7KqoITak8/2kx0k9AS8vL7Rv376shx56SNH6AEUxgL1790bNnTuX1/itsT7HZfx8wRK1jR+ChF0fNe6xUMCaxPMlec6AKz+2uffeey9x//79UQqqL18AWJbVlpSUGI4fP86bRuoPLCVKStNIwdidF7VEAAk8myA0TUgaB0M/P2GLiouLDdgWZVZdvgDU19fHb926dRzpBp5cX1rsy6o11oeeHrCERntQEtQW24KOrxxse9gGm5qa4mVVGiHkKjejt7f3kX379nEGN6RMbXB9RgoXAvGVBQYPkCC3vfB1bFyxLkbi+hi+ely/fh21trZOys/PX0RcUQtkeQC1tbXJGzZseOBNPXLH6KQ/MI2bAQBykNvpWH+mFYS0bNfYBr/55hvskSfLKUuyALAsG5aWljaVa3MPRMngabj4AEATGp2JVNsQ+mwpJrW1tSgjI2Mqtk2pdZIsAIWFhfH5+fmRQhXlg9T1t/4stecHALWgHTSUGzuwPp6bmxtZVFQkORYgWQCOHz+uN5u51x6QBi/4zkmZBeC6Nhg/YAuUDFu5hgLWtiA0VOCzqQsXLqBjx47piSpmgaSVgCzL6kaMGBGudOxvfY5vPQAJYPSAPWA4VvNJyWu9YpDvb67PXGCbNBqN4dhGpWwtLmkWoE+fPoa8vLxhd+7ceaByQv9bp+P6W260H4wfsDek7VSOJ0ByzvLvO3fuaLy8vNy3b9++mbT+koYAFRUV+ubm5g4Xtw5OSBkKyH1LDxg/4CjQXj8gNy22zXPnzkkaBhALAMuy+l27dsnaN60dWoYNxg84InJmwORuRsrVqeLz3377bZutkpZJLAAmk0lXU1NDXBm+z9bHSSKeJOUBgCOgtEcXGh7zlW1pi1evXkUHDx4k3jWISABYlo1cs2ZNPFdFSYOAJIE/AOgKiAXAxWbASL1rPhv829/+Fo9tlqSuRAJgMpm8L126JOmBA6kGDr0/0JWQ2lZJXz5DwsWLF7WHDh3yJklLJACHDh3SlZWViaaTMiUIrj/QlREb25OsgxHLxwe2VdJhAJEAaLVafUtLi6RK0DRYMH6gs0Fz2TDJLIPl+Zs3byJ/f3+iQCCRAGzbto2okqSAQQPOgFSbEBo2kwbd29m+fTvRdUUFgGXZxMrKyiiuC5JMYYhVVs7UCQB0BcSmBZW0/YsXL0Zh2xVLJyoAJ06cQLdu3epwXGgFH4mKAYAzQMszJpletzyGbZYkbie6FNjV1TXq1KlTk9qX/4ot9RWrKAT/AGdDimELnefzvrnKcHFxQQ0NDTuKioqKhcoX9QDq6+t1lpt+ilWA5mu2wfgBZ0RqHICL5uZmVFtbKzoTICoAAwYM0Lc//Uezx4axPwBwo2RNQHsabLP9+vUTnQkQFYDr169zVkyqgUp5YAKMH+hqkA4DaK4JaGhoEC1DVADKy8tFCwEAQBzaHZvYS0lIbFdUAGpra+XUTfYaAQBwRtSwFxLblTQEkIvYvucAADwIjWB6fX29aBpRAWhqaupQEejdAUB9lK4hsLRdPkQFgPb7/m1RBgA4KlLat9huWWKBdRLbFRWA1tZWoooJAUYNAOKQetZCy/Etz1ERAMsdgIUAIwcA9ZD6DA4itF1Zrwaj/fyynLQAAPyK3OdsZL8dWKgCStY+A0BXR8qCOLXthVgA5FYEngAEAMdF0puBAACwHbboPKW8F0DdmgAAYHOoxABsMVYBAGeANLBOy96oCAD2DpRuawwCAgDkcL2hSw6yBUDOFCAYOQCQY93Tq2E/1KYBlQIxBsCZIDVmS7tQw0YcRgAAALA9IAAA4MSAAACAEwMCAABODHUBkBuphBkCwNmQs7EubcADAAAnBgQAAJwYEAAAcGJUFQChJcIAANgf8AAAwE5Ifb2+GoAAAIATAwIAAE4MCAAAODEgAABgJ0jG92oH0VUVACk7l8BsAQDYHvAAAMCJAQEAACcGBAAAnBjqAmC9hRHp2B6eBgScDUeIe4EHAABOjE0FQEjxHEENAcDZAA8AAJwYEAAAcGJkCwC47AAgH6XB8fbjSu1Q9ZWAUgBRAYBfsZ5Fc9gXg/At+eWqMBg5ADgOqr8cVE5ZAOCs2Lr9EwsALNQBADrQMHJaQqH6LAAWDujVAYAelvZkt9eDC2EduADvAQDUwWFmAYSMXGolwWMAuiqO1rbtshCI5EdwtB8KAOxBp9kVWMxg5Rg0iADQlVDTBuQKhcMvBQYRAJwFoUU/pHYg1V4UCQBpJZW6MSACQGdHThu2RfDcJh5A+0yAkmWN8JoxoDOipN2SdKh2mQaU09PTWhbc/oOCGACOjNI2aqupc1kCYFk5vl5drTGLdV4QAqArIGUrPaFzUoXDjTShIy/ocQQRsBziOOrv1FWw/J0d4d4rRWknqKQsYgGgQfsNszYQRxYXUsS8n87+/eyBGlPLjg5XvEwoLdffUlBVAKwNu72SXVUEhKC5frur0hUNWgyS2JiaewJQFQBo2GTAUOFXnNHo2xEKptvqd1E8C8DVkwt9FtrKyNki/Jbf11m/t7PC1/7FjJ/mFCCi4QFYuu4kbrzllxRKr+aQQGnDU7Pn7qpDIVsau9i17P370gr60fhNqccASNxbKSJgDenWY2pCcxqGpHx7N1glqHVvaEbOpaDkXvBdV2hWQ83xP7LVLABf0M/6b0d4X7pS1DDezhYzoH2PHOme0+6U7D2lSUUAaLmttnJ/bTkEoCkInWF4QKMRKy2DJD/N35FGe7LXlCcVAbD+Mfnm+8XK4AoMKd1anOvH5VvJSFpPobwkMRDStGL55ZZBE1oNk8bKUTnCLBSUltOO5VyfZCpQ6LySeyBbAKSO3cV+SL4bInRjuNKT1kUuJDeGq05ibqLcRmbP4YHaPbVlrEitXlIoD9e6Fa7fm0SUxdoxLaSWadMhAOksgSVS0yuFRg8jJjpqiEFnGT6RGjFJR0ByLVq/CUm7EKsr6ROxUsVCiZBIEgCpPyhf8E/JGFoOtnJTSb4XyTMDcnt1OUMSqeWpVY5Q9FtJvUjjAVJ/O9reBq18Uq8h2wMgNWwaIkCK2r2T2JiQpBHx9QCkv51U5IgJTa9KrJdT4lUJpZVi1KQ9sdoeli0EwhpFMQCkcOxKq3HLua7SOADp4ifS34kvHY04gXU5aiOl91ba00u9n1zBN6n3sh1bDbnUnCJUFAMgdXn5UOtLqREsss4nNpYTWyLNlcY6HV8Z9o7886Gkt5cSGyARESltgGRcLsVzoOVtSYkRyIXqQiA+d98S2o2XZvmkP6ycBUtyXHwxr8BRhECooQpFy0kaP2ngjLRcS9Raz0EzbiXW+yu9liQBUDJOJVn6S4qQW0TSC9GOFSgJ7JG4+I4oBKQ9LM3e2fKY2PQvCVy/vdQhG0laOfXiWxdDWwyozwIIBQPlIMcNIhUIPlUXKltsDYK10PAFQLkaGomIqLWeQApyXX2h+yF0v4R+Z65ySefoSYYVYoFfrjp2llgNUjoEEOoJSfKSDBfkBHi4/iYxbqnuJV8PYllnIUMXKsM6j3V6qSKhFCW9NokXIPSZ617KvY9idbEWZ6H7KFRf6zoKeYlc6WwlBIpjAEJqyweNdCQNkusG8pUjJBAkrjepUfOVKVQXqUMvmh4ByT2Q0+NLOW79e4h5CkJlinlcfB0HVx4SoeaD7x7RdvHFkCwASoYBXOmkXpvkunwNhXRoQHqOxNDEbjSJcZP0HEJlWSPFYIXSCfVWfL89yTWF7qPceyh2PcQzHcjVO/MFJkkDgyQeklAdaQqB5CCgEhdfLlJ+IDGjt/whPT09kUajQe7u7ujGjRul3t7eTQEBAcjf37/tuJeXF7p37x5qamrC51FtbS26fv06Ph6Fj7e0tKDm5mZ0584d3jqS9Dik7jxpQ5MSwJJCe9lSDB/x3BsxURUrB9ehW7duyMfHB7m5ueF7ZPb19a0ODAxEffv2Rfg+4nMuLi7o1q1bqKGhAVVWVqJLly6huro6bw8Pj0h8D2/evNl2D+/evSsqWtbX5/t91ELM/uSIA7UdgSy/vNKIP6nakfQelulcXV1RaGgoGjZsGLp9+7bp2rVrxnfeeQc9//zz+HQOwzA1hPVLxA1q3bp16PTp07qAgAB9WVkZ+uGHH1BjYyNnffi+n/X34HJ3+QKJYt+dtgAL3Q9Sb4u09+PzXPz8/JBOp8MibT558qRh3rx5KDo6Gp8rYBimlPD7aBFC8XV1dejPf/4z2rhxIxo7dmzm0aNH0cmTJ3Hb4OwwhDwDse9jnY4UKZ6DHGEXrVGfPn1+KZUvIkoSKUUKXU++H1+snLCwMBQSElIzePDgnCVLlpgYhjGKXkwmLMvqysvL9TNnzsS9UuKZM2favAdruH4/sTRSj5EMTwS+h+x0Uu4NyTFs8AMHDsS9edayZctQ7969jQzDmIgqKAOWZfX/+Mc/dHv27Ik3m81afA+xd2AJ3+9JYgc07oWU37iyslLwgtQEAKnsApF+6fZeonfv3qV6vb7p/PnzSfPmzWvy8fEh6h1ocezYsai1a9eG+fr6puzZsyequrq6zd20rquUz1LTIZluIUkeuQbNddw6DXbdNRqN+a233qpuamoyvP322+Y+ffoUS/gKimFZNnL79u3eDMNk/uMf//A+ceJEJL6Hra2tD6QjvUd8kMYNSM9bH7OJACAVRUBKowoJCUEvvfQSevTRR5MmT55M7NKrTVNTU+KiRYvCr127lrxnzx7RRkTTQ7A+R+IZSG14ct1968/u7u4oLi4OBQcHL/3www+zSV16tcFDhnPnzsWnpqbqzp07pz916lSHNFLvB4U6CX5uh6oAPJBRxPVUY/qJ6xge1/fv3x8NHz48a/HixRdcXV2XKrqwypw8eTJz2bJl8UeOHNFeu3btgXOWvxntYYFSaLv2lp8DAgLQs88+W7NgwYKcAQMGJFGpsEqwLBu2cuXKlG3btiWWlpa2BYAtEfMIpAyVhYKSDikAvBchTCul58Fl4h7/1VdfLZ0wYULmv/3bv6UTV8jOVFdXR37//fdJX3/9dfyZM2fCLOMEYiLAd1wtIZBi+NbHxYTA19cXj+/NM2bMyImOjs7s2bOnQ/T4JOzduzfqhx9+SMnJydFduXJFSzI0IA3mWiMUNOb6bIlqAoBEviRplFROYM/DwwNNnDgRvffee0kDBgxwGFdfKnicmZqaOjUvLy/Z2q2UOiyQG4AlqCPRcZJGaXnskUceQePHj1/6wQcfOIyrLweWZXUff/xxwYYNG9qmE60REwIxEeDyqO0qAGJuPq2IM9/xxx9/HCUnJ6fHxMTMkXQhB4ZlWf2HH36YuGPHDt3169d/OS51SKDmbIzQVKCUzz169MDjfJPBYMhSc0bG1hw9ejRt2bJlswsKCjqckzIrwNdBcp0TO47sIQAdLiDSw3PBldbb2xtNmjTJHBUVFf/666+fYhimo9x2YliW1a5fvz4rKytLd/bsWS3Xbyw38EehbsTn+D7jugwaNKgmMTHR9NprryV2Vq+ND5ZlNQcPHhy8c+fOnM2bN4dZCjmSaCscZYtdm/ecKkMA0p5GDlxfJjAwEM2aNcuckJAwrjO7iyRcvnxZ99FHHxXk5+f/MlugZFZA7n1SOgVl+bebmxt67rnn0PLly2MDAgJUm8N3BPCwbvHixVN37dqV/NNPP3U4L9U7k7JGRvV1AB0yq9zD4PIHDhyINm7cODUgIKDLuIti4HHlnDlz5nz77bdxDQ0NvxyXO10odWaGpvH7+vqiF198cfMXX3yRpuYCHkcDD+smTJiQffz48bbl5NbYwjtDBAIg6+3ANOH7Aq6urmjYsGHNf/zjH+c4k/GjnxuH6ZlnntEnJyen9+zZ85fjSgNvrNVbeVkKbye2zmf5t7+/PzIYDOnDhw/XO5Pxo5/voTE1NXXO+PHjm93d3Tucl/t700aRB4BUiC63M3HiRIR7wcGDB3ea6T012Lp1a/ann36qr66u/uWYkriAXKRO+/Xq1Qv94Q9/ME6aNGkq9cp0IsrLy+NwJ7Zjxw4dXxqlNiS0clPVIQBSGPXnqjgeL8bFxaH09PSpXSlKrASTyZQ2f/782Waz+ZdjJOsFxM6RIGehT2hoKPrss8/SY2Nju8xMjVLmzZtXsHHjRt3t27cfOK5k8ZzQ2L8d1YYANKL7XMY/ceLE5g8++GAOGP+vxMTEpKSmpqbjXrUdLleeJnxlih3DdcR11el0KVQr1Ml5+umn45977rk9Hh4eDxxXK5hOCpUYAEkDJFG5kSNHYqVMCQ8Pd2q33xqGYZpHjRo1Z+nSpUY/Pz/L48TjfilIWfxjeaxnz54I13H06NFzuto0rVJee+21mmeeeUYfFRXVIRbCWm0CShr5RxI7YC4UzwJIWbgg5K48/vjjaOfOneD2i/D3v/897b//+79nW84OIAlDAqE0QoYvtgCoe/fuaOHChem//e1vwe0XgGVZvV6vz/7uu+84f2+SIYHY0mBLVJ8FYO7vEGNZOSnuI/r5mf3mjz/+GNx+AmJjYzP/8z//s8bV1ZU3DalHRjoDIGb8uC7jx4/f7OLiAm6/CLiNz5s3b86gQYM4PSS+WRu++6TUA6D2YhChZwCEKol7jueffz5l+PDh4PYTEBISUsqybPyPP/5YkJeX94ArKPdhEyHEhByX//zzz6P78/zg9hPwxBNPpG/atAktWbIk7erVq5xpxGxHLPhHiiIPgEuR2j0ChnB742nTppX+4Q9/yFFSD2eDYRhTampqbL9+/R5YTqv2vDJX+RERETXLly+PdbZ5fqXEx8fnLFiwoJTPk7O0HUubsva4laLaQiCxxoi/hE6nQ++///44hmHMatWjqxIcHGxKSkoy9ejR44HjYoE6IVEmSWcd9Js2bZqpqy/vVQPc5qdMmTJu3LhxZhcXYTOUMpyWCtVZAClRTH9/fzRr1iwjGL983njjjcSxY8dyRpW5jrEcu/pa/hNyO7mO/fu//7vpt7/9bSK9b+Rc4Lb/+uuvG4KDg0XTWk/70sIuS4Hd3NzQO++8U6zT6Zx6lZhSGIapSU9PzxoyZEiHc0K9vKUQkAzZuI7ha+Jrd7Wn+mzNc889l5WYmJjerVs3ovS0h3l2EYAhQ4bUvPjiixAxpgDDMMaYmJil3t7eHc4JNRZSr43ruEajQcOHD18KszZ0ePLJJzOjoqLsIqQ2FwDc08ycOTNn0KBBe2x97a7KJ598kv3II490GEopjRTz5R00aJB54cKF2bILBh4gKiqqNDk5OQd7xrbG5gLwwgsvoAkTJjj0xo+dDYZhSt95550cyycHkcLVYnx5unfvjhISEnK6+r4MtubJJ59Meu2112y+LNimAoAbz7Bhwxx6197OyrPPPpsZHR3dwY2ktSNTO/gazzzzTKbcegL8jB07dqm/v79Nr2lTAYiIiDD//ve/B9dRBXr37l26YMGCHOt5ZeupPTGE0ri4uKD58+fn9O3bF3p/FRgzZkx2VFSUTWfFbCYAnp6e6De/+Q24jioycODAJDzE4kNscZaYQIwdOxY98sgjMHxTCWwbL730Uo712g41sZkADBgwoGbo0KHgOqpMWFjYUo1Gw3nOeq6faxaAbwzq5eXV9sYeFasO/BwQzBw0aJDNZgRsJgCPP/54zhNPPAG9v8p8/PHHF/r06SMrr9CsQVBQEFq0aNEFhdUDRAgPDy995ZVXbLY03iYC4Ovri1JTU2G5qA1gGCZrwoQJvC/SFFpfLjQEGDt2bLGbm1uWOrUGLNHr9SbLzV/UxCYC8NxzzyFYNGI7bt68abCeErRGyvJtLOC4TBWqCnCAbWX8+PE2uZbqAuDu7o68vb3B+G3IW2+9Ze7fvz+18gYMGNBWJrUCAVG0Wq3Ry8tL9euoLgC4J5o+fTq4/zbkoYceKtZoNNTcdTysGDx4sE3fz+/szJ0712S5/ZtaqC4AXl5epf369YPn/W1MWloatbL+9Kc/USsLICanV69eqgfNVReASZMmNcETY7and+/eRho9iI+PD/YoYAhnY7DNTJ48uUnt66gqAK6urngIAO6/HWAYxhQTE6O4nGHDhiHY7cc+eHp6mjw9PVW9hqoC0KtXL/Tjjz9C72En/P39FQfugoKCIPhnJ65fv26Uu6aDFFUFICQkBM2fP1/NSwAClJSUGEg3muDC3d0dFRYWwvSfnUhISGh7M7aaqCoALS0tpf369atW8xoAP7NmzUJcG4WQotFo0FtvvUW1TgA53t7e1ffu3VM1EKiqANy5c6cA9vyzH2PGjEHWr6KSAh5/TpkyhWqdAHKw7Xh7exeoeQ1VBWDEiBFqFg+I4OHhUdDU1CRbgF1cXNpWAQL2Y9y4caqWr6oAxMXFqVk8IALDMKW+vr6yh2DNzc3FDMPA+n87Eh8fr2r5qgrAY489pmbxAAFKgki23p0G6IiSGA4JqgqAu7u7msUDBJDsOc+H2hFowP7YZVtwwHYoWQ1oy51pAG4YhkkSe3OQEkAAujh8uwORoPYqNIAMoTdBKwUEoIujZBpQzYYHkAMeACCbhoYG2Xlv3rxJtS6APO7evata2SAAXZzGxkbZeZub4XX/9oZl2eTW1lbVygcB6OJcvXpVdt5r165RrQsgi3A1C1dVAJQ0PoAOlZWVsvNeuXKFal0A6dy5c0fV8lUVgPz8fDWLB0RgWVZbX18veyWJm5vbYJZlYTmnHSksLFS1fFUFIDc3V83iAXHiu3XrFik3M8uyGoSQbfanBjjZtm2bquWLCoCSKYhLly7hHkQruwBAEefOnUNKAkjY/QQvzn5g2ykvLx8sNz+J7YqmUDIX3L17d92tW7dUDWIA/Hz11VeKIvk475o1a6jWCSCntbU13NPTUyc3v5ubm2gaUQEgKYSPa9euoR07dsjODyjDzc1N39LSIjs/zuvn56enWimAGJPJhOrr62XnpyIASp5G+umnn9Dly5dlKxigDBcXF52SIQDLsrgRwf2zE6dPn9aZzfL30/Hx8RFNIyoAYq+YEqKpqQl6EDty+PBhxWUUFRVhIQijUiFAEt27d9ffuHFDdn4S2xUVgICAANkVQDATYDdYltWXl5crLgd7cQihFBp1AqShNABLYruiAqD0HXOlpaVRLMsmKioEkMznn3+uo7GG/N69eyglBezf1mCb+fHHH6OUlBERESGaRlQAlO4Jh12YZcuWKSoDkMatW7cijxw5Qm0vqdLS0vjGxkbZ6wkA6Xz11VdIifuPaMUAzp49a1SyFqChoQFdvHgR4gA2JDMz0/vSpUvU1l9UVlZq09LS1N2bCniAs2fPKhr/Y5s9d+6c6Et5RC3bz8/PpOQ1xSzLouPHj+tYloVoso3o1atXZkVFBbXyzGYzCg0NzaRWICDKfZuRnV+j0eB2IPpKN1EBmDFjhqJdZTDl5eVtiqaoEIAIlmW1RqPRW0nj4SI7O9sbVnXahhMnTiSXlZUpKgN32tOmTRNNJyoAAwcOVLw11L1799DixYtjYTpJffbu3RtvNpupj9evXLkSuXXrVnX3qAbaplw/++yzqdhmlIAFoF+/fqLpRAWAYZisvn37FiuqDULo5MmTkbt27YIGpDKHDh3KJHmOn2GYDv+EqKurQ0ePHoVhgMpgAce2orSc0NBQonc6EEX3Jk6cqLQ+qKqqCv3www8wDFARlmWTN23ahMTc/3Zjx+ks/4mUjbZs2YJaW1uTqVYaeICjR4/qL126pLicCRMmEKUjEoC6ujqjkkAgut+Atm3bFt7c3AzBQJVYuHBheHW18IuALI2f7xwfNTU1aPXq1VNhKKcOLMvqNm7cGK40fqPRaNpeLU6SlkgAdDqdaeDAgYoqhamurtZmZWWp+rJDZ6WkpGT2gQMHBBdcCRm/5XEhITAajZGHDx+GoZwKZGRkFFy5ckVxoBXbamxsrOgMACIVgKeeeqopJCSkRmnFWltbcQNCN27cADeSIizLag8cOJAktPTX2vi5YgBiAoGpqKhAeXl5STAjQJf6+vrk7OxsRfs3tHPr1q3Njz/++CmStEQCwDBM6e9+97scxTW7v0fdZ599Bm4kRY4cORKPe2ahyDHJON8SPi8Al7Fp06bI/Px88AIogW0hNTV16uXLl6mUt2TJkmqGYYg2giBe4oeHAUFBQYoq1s7mzZsj169fDw2IEn/5y18y+Tb/tDZkkog/EvECqqqq0Pr162FGgBLr1q2L3759O5Wp2+DgYBQdHU3k/iMpAsAwjDEmJkb+w8kWXLt2DeXk5BguX74MG04qgGVZTV5eXtru3bt5g3rWLr8Y1un48uTl5aHt27en3d83EJBJVVVV3LZt2wx1dXWKy8L3asSIEWZsq6R5JO33NXr06OZz585Nun37tqwKWlJdXe2u0Wj67Nmz52+KC3NSBg0a9NiKFSv+KuY6khi+UB6u/Hi4UVFRMYxl2c1btmyh47s6ISEhIVlbtmzpT2Ps7+vri5588skPCwoKiNftSHrKJzU19VRQUJDiYCD6OVCBVqxYoYPFJfJgWTayoKAg51//+hfn+XajlWP81mXwDQdOnDiBTCZTDq6L7Is4Md9//33mV199pcO2QANsm0uWLCEK/rUjSQAYhjFNmjTJROtlhTdv3kSffvpp/LFjx8ZRKdCJyMzM3JOXl8cbSMVGq8T42xErY//+/WFffvnlHsUXcjKOHj06btGiRfG03r+IbRLbJrZRSfmkXqh79+4GkjXGpPzzn//Urlq1yghPC5Jz/vx5/Zdffhlmq3f3CXkTuAF//fXXYSUlJbDKkxDc1rOysozHjh2jNpUaERGBevXqZZCaT7IAJCUlVY8ePbpUaj4+cE/17bffahMSEmDXIAIOHz48++23384WCxrR6P2t4RsKXL9+Hc2ZMycb1436Rbsgv//97xN3796tpfnE5pgxY0rffPNN4WWgHEgWAIZhzO+99162VktvHcjt27fRgQMH9CtWrICosgClpaWzlyxZYjhz5oxgOjWMXywoiOuE63bq1CkQAR5w2/7LX/6S9t133+lpBNLbCQwMRO+++242tk2peWUN5gMCApZOmTJF0VuDrMGuZGZm5uxdu3ZJdmOcAZZl9QaDIa2kpEQj1HOoYfzWZXNdHx/DdcN1xHVVrRKdmNzcXMOf/vSn2bTG/ej+i3tef/111LNnz6Vy8su24OnTpyc9/PDDcrNzUlNTgz788MPZW7duzaZacCfn/Pnzs2fOnJm9b9++DktFSebsreFbBky6ToAPXLf8/HzcNrIrKirAE7Bg27Zt2XPnzp0t9rCWVHr37l2TkJAQKze/bAHo2bNnzssvv7xHyZuDuMBj2+TkZH1ubi4MBxBCZWVlsz/55BOD2BuWpBi/0nLEphh37dqFPv30UzxUcXoRwG0Yt+X/+q//0pPs0yAFd3d39Oqrr5oCAgIkRf4tkW29DMPU5OfnpwwdOnRccbHi/UIeAIsA9gTmz5+PP86hWngnArvSU6dOTTtw4ADvQyIk031ShwWWKwjlpLl79y767rvvNPfu3cMiXiNlZVpX4+9//7th2bJls2ms9LNm6NChKDo6WtGQWfGAsbKyMlOn0yXSHNe0061bN5SUlIQWLFgQK3V+s7NTVFQ0e+HChWlCC31I5/ot05BEni3H+mJiYLnUmCvdkCFD0KJFi+ZER0eni164C8GyrO6Pf/xjQWZmJqK10McSjUaD8vLypj700EOKxFVxFC84ONjwyiuvmGkPBdD91YKrVq3CIpBTUlLiFIuFWJYNW7t27ZF3333XwGf8iNCQEcfuP1JQGhPA4O+Av8uaNWuOOMsToLit4jaL264axo9tDducUuNHNASAYRjzmDFjxoWGhlJ5UMia27dvo507d2o/+ugj4969e7v0smFsIMuXL99jMBiiKisrReMftF1/i3o8IBgk1xESF/xdli5dGoW/W1cXAdxGcVvFbZbmVJ8l4eHh5gkTJlDpEKnNGeXn56fNnTt39pUrV2gV2QFPT080Y8YM0xtvvJEWHBy8WbUL2QGTyZS9bNkyvVg8hZbrL/S8P1c6Eu+BJE1UVBSaP3++MTY2dqpo4k5EVVVV3Pr16+d89dVXOiWvZBejd+/eKC0tLX3kyJFUYmPUBKClpUWTmZlpXL58eRyNd9Lx4eHhgYYOHdocHx+f8rvf/S5HzuIHR+L06dPjNm3aZPif//mfqPr6ekEjsn68Vww+4xXLq1QEhDwCfK5nz57oN7/5TfGUKVNSIiMjO/VzBNijyc7Ojsf38Pjx4xo1XP523N3d0YIFCzZPnz5dT7rhhxhUV42wLKubPn16wY4dO5DSfc3F8PPzQ6NHjy5dsGBBdmhoqKxFEPZmw4YNmX/961/jT506pRUTTbnGj6wMl3RYwJWHlheA7i9geeSRR2refvvtnClTpiQRZXIwLl++nLxs2bKpubm5kWpE+S1xcXFBL7/8Mvryyy+pBsSpLxvDIvAf//EfOYWFhTbZMy4wMBDp9Xo8NEjy8vLCHgGVx5XVgmXZyJUrV049fPhw8t69e4nyKDF+RFEArI+T5CVhzJgx6Omnn146a9asbIZhqD1nohaNjY26rKysguzsbKTmkNcSnU5X880338TTng1TZd3o1q1bx6WnpxtPnz5tExHAvUlISAgaNWpU6ciRIzNfeOEFhxsaHDt2LLKkpCRp3bp18RcvXgxraGggyifV+LnS2VoAEMH0oDW+vr6ob9++5qlTp+YMHTo084knnnAoIcCufm5ubnxubq5+79694XV1dVoam3iQMHjw4Jp58+bpx48fT324pNrC8YMHD2bOmjUrsaqqSq1LdAA3tuDgYPTQQw+Vzp49u2DEiBFGe68fYFlW/+abb+qqqqriy8vLtVLXS9AWAJJyhNKrJQDteHp6ooiIiJrg4OCctWvXmuy9iAh7tIWFhfr09PTYCxcuRFZWVkr2cJSA2/PKlSuznn32WVWGSeo9OYIQ+r//+7+CefPm6cxm23fGuOGFh4ejp556yhQWFmacO3cuInlVklJYltWazeb4r7/+WldXV6fPz89HTU1NssqSY/xcaaW8BEQsrZTGL1cE2tFoNGj06NHIz8/POG3aNNPDDz9skyEey7KJX3zxBbpw4YL+6NGjuoqKCpsafTu4/S5fvtw0fPhw2Wv9xVBVALAxbNq0yfj555+Ps4cIoPuND7uX3bt3xz1L8fjx49vedBQUFGR66aWXkJeX1wW5jQq7hefPn++Vnp6OBg0apK+rq9Nt377du6WlJbK+vh7JnQfm2sNfTn6LesqqB1d5UsuynLKUWw8PDw/Uo0cP7B2UTpw4scnf39908uRJ4+zZs1H//v2r5Q73cPtsaWkJ37lzJ6qqqtL16NFDv3v3blRWVhZ148YNhIdp9jB8dN/458+fvycuLk6vpuipKgDo/o9cWFiYM3PmTB3tJ6Hk4u3tjcebyN/fH9XW1poCAwNPjRkzBo0dO7bth2+HYZik+wtXUtD9lYlHjx5FOTk5qKioCDfIWI1G0+YWXr16lcpLHRBHj6lUAJAC41Ni/IhDxGgYlKurK+rVq1db3Kepqam0ubm5YPjw4Sg+Ph57fG1LyO9jwOLAsuwvC8guXbqEcnNz2/5duXJlsL+/P/bU0MWLF1FjY6PiutEgMDAQu/2m6OjoeLU9HtUFoJ3CwsLMTz75JL60tBTeKCMAl6HIXdEnlE/qngJyDVfudKKzMnjw4JqlS5fmqDXmt8ZmAoB+3hBh3Jo1a4wFBQVatdcJdFa4xstKN/lQkl+psYIAkOHi4oJGjRpV89Zbb+nHjBljs8VRNhUAdD+q+u677xZs374d3blzx9aXd2jkrtxTci0uaBooCIA47u7uaPLkySgjI8PmT73Sf4RPBPwFWZaNHTJkyJxVq1bF4bEz8Cu2Mg57GGF7QFDurEBXJCgoCE2bNm1zYmJimj2mrG3uAbTT2NioOXTokOHzzz+ffeLECWoBtM6M0uW7jgSNtQRdGVdX17YNPT744IP0mJiYFA8PD9vs8W6F3VtWRUVF4ooVK1K2bNlis33uHRkhN7kzCQG4/vz4+PiguLg484wZMwzh4eGqr00RwmFa1MWLF/UzZszILikpQWo+TdiZ6ExiQHMBUVfFzc0NPfnkk8hoNE718fFxiG3SHKoV7du3L6q4uDhl48aNusrKSpgpuA9pD2prUSARJjD8nyP8oaGhNa+++qopKirKMGrUKLqbaCrAoQSgncuXL+uys7ML1q9fjyBI+Cty9/ajhZS1A2D4PxMcHIzeeOMN9Oabb8Yq2b1XLRxSANqpra1NzsjImFpYWBh55swZCBQSIGWNv9zywLiFcXV1RQMHDkQ6na70/fffz/bz83PY/SocWgDQ/fX2W7Zs6VVeXp6ydetW3dWrV7WNjY3QCAGHAgulj49P2yu6J0+ebOrXr5/h5Zdflv2cgq1weAGwhGVZ3caNGxP/+c9/6nft2gXDA8AhCAoKQjExMebAwEDDxx9/fMrej6BLoVMJgCUsy+qLiop0n376aS8PD4+4srIy2Y/dAoAUvL2921z827dvb168eHH1sGHD7L5vgVw6rQC0w7KspqSkZLDJZNL5+/vrDxw4gA4dOtTLxcUl7ObNm6i5uVn1/QmBromLi0vbngT4H0LI/PTTT1ePHDmy7XHykSNHmh599NFTtDbntBedXgC4YFk28vz587ErV67EwwRdRESEvqGhAZWXl7e9gLSurq7t0c+7d+9CYNHJcXV1bZufx+N3Pz8/pNVqUf/+/ds+l5eXG3v37m2aMWMGCgsLK+gM+xUCAAAQQ+8F/wAAdDpAAADAiQEBAAAnBgQAAJwYEAAAcGJAAADAiQEBAAAn5v8DAAD//9cHhJ9BhXYCAAAAAElFTkSuQmCC";

// Uma única fila coordena atualizações dos recursos da página ativa.
const tmRuntime = (() => {
  const jobs = new Map();
  let pending = null;
  let observer = null;
  let running = false;
  let lastRoute = null;

  function flush() {
    pending = null;
    if (running) return;
    running = true;
    const route = window.location.hash.split('?')[0];
    const routeChanged = route !== lastRoute;
    const previousRoute = lastRoute;
    lastRoute = route;
    jobs.forEach(({ job, routes }, name) => {
      const onRoute = (value) => routes?.some((prefix) => value === prefix || value.startsWith(prefix + '/'));
      if (routes && !onRoute(route) && !(routeChanged && previousRoute !== null && onRoute(previousRoute))) return;
      try {
        job();
      } catch (error) {
        console.error(`[TM] Falha em ${name}`, error);
      }
    });
    running = false;
    observer?.takeRecords();
  }

  function schedule(delay = 80) {
    if (pending !== null) return;
    pending = window.setTimeout(flush, delay);
  }

  function start() {
    if (observer || !document.body) return;
    observer = new MutationObserver(() => schedule());
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', () => schedule(0));
    window.addEventListener('pageshow', () => schedule(0));
    window.addEventListener('focus', () => schedule(0));
    schedule(0);
  }

  if (document.body) start();
  else document.addEventListener('DOMContentLoaded', start, { once: true });

  return {
    register(name, job, routes = null) {
      jobs.set(name, { job, routes });
      schedule(0);
    },
    schedule
  };
})();

function tmCaptureAttributes(root) {
  return Array.from(root.querySelectorAll('*'), (element) => ({
    element,
    attributes: ['class', 'style', 'tabindex', 'autofocus'].map((name) => [name, element.getAttribute(name)])
  }));
}

function tmRestoreAttributes(snapshot) {
  snapshot.forEach(({ element, attributes }) => {
    if (!element.isConnected) return;
    attributes.forEach(([name, value]) => {
      if (value === null) element.removeAttribute(name);
      else element.setAttribute(name, value);
    });
  });
}

function tmCaptureHeaderContents(root) {
  return Array.from(root.querySelectorAll('small'))
    .filter((element) => element.querySelector('.fa-calendar-alt'))
    .map((element) => ({ element, nodes: Array.from(element.childNodes) }));
}

function tmRestoreHeaderContents(snapshot) {
  snapshot.forEach(({ element, nodes }) => {
    if (element.isConnected && (element.childNodes.length !== nodes.length ||
        nodes.some((node, index) => element.childNodes[index] !== node))) {
      element.replaceChildren(...nodes);
    }
  });
}

function tmParseDateInput(rawValue) {
  const value = String(rawValue || '').trim();
  const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const compact = value.match(/^(\d{2})(\d{2})(\d{4})$/);
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!br && !compact && !iso) return '';

  const year = Number(iso ? iso[1] : (br || compact)[3]);
  const month = Number(iso ? iso[2] : (br || compact)[2]);
  const day = Number(iso ? iso[3] : (br || compact)[1]);
  if (year < 1) return '';

  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(12, 0, 0, 0);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';

  return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

(function () {
  'use strict';

  function norm(text) {
    return String(text || '').replace(/\s+/g, ' ').trim();
  }

  function monthNameFromNumber(mm) {
    const months = {
      '01': 'Janeiro',
      '02': 'Fevereiro',
      '03': 'Março',
      '04': 'Abril',
      '05': 'Maio',
      '06': 'Junho',
      '07': 'Julho',
      '08': 'Agosto',
      '09': 'Setembro',
      '10': 'Outubro',
      '11': 'Novembro',
      '12': 'Dezembro'
    };
    return months[mm] || mm;
  }

  function tmDateCalcIsOwnCopyButton(targetEl) {
    return !!(
      targetEl &&
      targetEl.matches &&
      targetEl.matches('.tm-datecalc-copy-btn, .tm-datecalc-copy-result, [data-tm-datecalc-copy="1"], [data-tm-copy-date-result="1"]')
    );
  }

  async function copyText(text, targetEl) {
    if (!text) return false;

    const isDateCalcCopy = tmDateCalcIsOwnCopyButton(targetEl);

    try {
      await navigator.clipboard.writeText(text);

      if (isDateCalcCopy) tmDateCalcMarkCopied(targetEl);
      return true;
    } catch (err) {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      let copied = false;
      try {
        copied = document.execCommand('copy');
      } catch (_) {
        return false;
      } finally {
        ta.remove();
      }

      if (!copied) return false;

      if (isDateCalcCopy) tmDateCalcMarkCopied(targetEl);
      return true;
    }
  }




  function applyLoginIndicator() {
    const passwordInput = document.querySelector('input[type="password"]');
    if (!passwordInput) return;

    const card =
      passwordInput.closest('.card') ||
      passwordInput.closest('.panel') ||
      passwordInput.closest('form')?.parentElement;

    if (!card) return;

    const logo = card.querySelector('img');
    if (!logo) return;

    if (card.querySelector('#tm-login-icon')) return;

    card.style.position = card.style.position || 'relative';

    const loginIcon = document.createElement('img');
    loginIcon.id = 'tm-login-icon';
    loginIcon.src = TM_LOGIN_ICON_DATA;
    loginIcon.alt = '';
    loginIcon.setAttribute('aria-hidden', 'true');

    loginIcon.style.position = 'absolute';
    loginIcon.style.width = '48px';
    loginIcon.style.height = '48px';
    loginIcon.style.objectFit = 'contain';
    loginIcon.style.right = '20px';
    loginIcon.style.top = '325px';
    loginIcon.style.zIndex = '5';
    loginIcon.style.pointerEvents = 'none';
    loginIcon.style.userSelect = 'none';

    card.appendChild(loginIcon);
  }

  const AUTO_LOGIN_LOGOUT_KEY = 'klingo_auto_login_manual_logout_v2';
  const MANUAL_LOGIN_PENDING_KEY = 'klingo_manual_login_pending_v2';
  const AUTO_LOGIN_PENDING_KEY = 'klingo_auto_login_attempt_pending_v1';
  let autoLoginAttempted = false;
  let manualLoginEntry = false;
  let autoLoginTask = null;
  let silentCredentialRequested = false;
  try { sessionStorage.removeItem('klingo_auto_login_trace_v1'); }
  catch (_) {}

  function getLoginControls() {
    const username = document.querySelector('input[name="login-username"][type="text"]');
    const password = document.querySelector('input[name="login-userpassword"][type="password"]');
    if (!username || !password) return null;

    const form = password.closest('form');
    const card = password.closest('.card, .panel');
    const scopes = [form, card].filter((scope) => scope?.contains(username));
    const submit = scopes.map((scope) =>
      Array.from(scope.querySelectorAll('button[type="submit"].btn.btn-primary.pure-material-button-contained'))
        .find((button) => norm(button.textContent).toLocaleUpperCase('pt-BR') === 'ENTRAR')
    ).find(Boolean);

    return submit ? { username, password, submit } : null;
  }

  function isBrowserAutofilled(input) {
    try {
      return input.matches(':autofill');
    } catch (_) {
      try { return input.matches(':-webkit-autofill'); }
      catch (_) { return false; }
    }
  }

  function hasPendingAutoAttempt() {
    try { return sessionStorage.getItem(AUTO_LOGIN_PENDING_KEY) === '1'; }
    catch (_) { return true; }
  }

  function markAutoAttemptPending() {
    try {
      sessionStorage.setItem(AUTO_LOGIN_PENDING_KEY, '1');
      return true;
    } catch (_) {
      return false;
    }
  }

  function tryAutoLoginWithSavedCredential() {
    if (silentCredentialRequested || autoLoginAttempted || manualLoginEntry || hasPendingAutoAttempt() ||
        GM_getValue(AUTO_LOGIN_LOGOUT_KEY, false) || document.readyState !== 'complete' ||
        typeof PasswordCredential !== 'function' || typeof navigator.credentials?.get !== 'function') return;

    const controls = getLoginControls();
    if (!controls || document.querySelector('nav.navbar') ||
        !controls.username.getClientRects().length || !controls.password.getClientRects().length ||
        controls.username.disabled || controls.password.disabled ||
        controls.username.readOnly || controls.password.readOnly ||
        (controls.username.value && !isBrowserAutofilled(controls.username)) ||
        (controls.password.value && !isBrowserAutofilled(controls.password))) return;
    silentCredentialRequested = true;

    // O navegador só permite a resposta silenciosa com uma credencial elegível.
    // Null/erro significa entrada manual; autofill não comprova que exista só uma conta.
    // A senha permanece apenas na memória; nunca vai para GM/localStorage ou logs.
    let credentialRequest;
    try {
      credentialRequest = navigator.credentials.get({ password: true, mediation: 'silent' });
    } catch (_) {
      return;
    }
    credentialRequest.then((credential) => {
      if (credential?.type !== 'password' || !credential.id || !credential.password ||
          autoLoginAttempted || manualLoginEntry || hasPendingAutoAttempt() ||
          GM_getValue(AUTO_LOGIN_LOGOUT_KEY, false)) return;

      const current = getLoginControls();
      if (!current || current.username !== controls.username || current.password !== controls.password ||
          document.querySelector('nav.navbar') ||
          (current.username.value && current.username.value !== credential.id) ||
          (current.password.value && current.password.value !== credential.password) ||
          current.username.disabled || current.password.disabled ||
          current.username.readOnly || current.password.readOnly) return;

      const valueSetter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (!valueSetter) return;
      valueSetter.call(current.username, credential.id);
      current.username.dispatchEvent(new Event('input', { bubbles: true }));
      current.username.dispatchEvent(new Event('change', { bubbles: true }));
      valueSetter.call(current.password, credential.password);
      current.password.dispatchEvent(new Event('input', { bubbles: true }));
      current.password.dispatchEvent(new Event('change', { bubbles: true }));

      // Permite que os handlers do formulário atualizem o estado antes do envio.
      autoLoginTask = window.setTimeout(() => {
        autoLoginTask = null;
        const latest = getLoginControls();
        if (!latest || latest.username !== current.username || latest.password !== current.password ||
            latest.submit !== current.submit || latest.username.value !== credential.id ||
            latest.password.value !== credential.password || autoLoginAttempted || manualLoginEntry ||
            hasPendingAutoAttempt() || GM_getValue(AUTO_LOGIN_LOGOUT_KEY, false) ||
            document.querySelector('nav.navbar') || document.readyState !== 'complete' ||
            latest.submit.disabled || latest.submit.getAttribute('aria-disabled') === 'true') return;
        if (!markAutoAttemptPending()) return;
        autoLoginAttempted = true;
        latest.submit.click();
      }, 0);
    }).catch(() => {
      // Sem confirmação do navegador, o usuário escolhe a conta e clica em Entrar.
    });
  }

  function cancelAutoLoginTask() {
    if (autoLoginTask !== null) {
      window.clearTimeout(autoLoginTask);
      autoLoginTask = null;
    }
  }

  function setManualLoginPending(value) {
    try {
      if (value) sessionStorage.setItem(MANUAL_LOGIN_PENDING_KEY, '1');
      else sessionStorage.removeItem(MANUAL_LOGIN_PENDING_KEY);
    } catch (error) {
      console.warn('[TM] Não foi possível registrar a entrada manual nesta guia', error);
    }
  }

  function clearLoginMarkersAfterSuccess() {
    if (!document.querySelector('nav.navbar')) return;
    const password = document.querySelector('input[name="login-userpassword"]');
    if (password?.getClientRects().length) return;

    try { sessionStorage.removeItem(AUTO_LOGIN_PENDING_KEY); }
    catch (_) {}

    let pending = false;
    try { pending = sessionStorage.getItem(MANUAL_LOGIN_PENDING_KEY) === '1'; }
    catch (_) { return; }
    if (!pending) return;
    setManualLoginPending(false);
    GM_setValue(AUTO_LOGIN_LOGOUT_KEY, false);
  }

  function markManualLoginSubmission() {
    autoLoginAttempted = true;
    cancelAutoLoginTask();
    setManualLoginPending(true);
  }

  function cancelAutoLoginOnInteraction() {
    if (!getLoginControls()) return;
    manualLoginEntry = true;
    cancelAutoLoginTask();
  }

  document.addEventListener('pointerdown', (event) => {
    if (event.isTrusted) cancelAutoLoginOnInteraction();
  }, true);

  document.addEventListener('keydown', (event) => {
    if (!event.isTrusted || !event.target?.matches?.(
      'input[name="login-username"], input[name="login-userpassword"]')) return;
    if (event.key === 'Enter') markManualLoginSubmission();
    else {
      manualLoginEntry = true;
      cancelAutoLoginTask();
    }
  }, true);

  document.addEventListener('paste', (event) => {
    if (event.isTrusted && event.target?.matches?.(
      'input[name="login-username"], input[name="login-userpassword"]')) {
      manualLoginEntry = true;
      cancelAutoLoginTask();
    }
  }, true);

  // Preenchimento automático nunca dispara envio: não informa quantas contas existem.
  document.addEventListener('input', (event) => {
    if (event.isTrusted && event.target?.matches?.(
      'input[name="login-username"][type="text"], input[name="login-userpassword"][type="password"]') &&
        !isBrowserAutofilled(event.target)) {
      manualLoginEntry = true;
      cancelAutoLoginTask();
    }
  }, true);

  document.addEventListener('click', (event) => {
    if (!event.isTrusted) return;
    cancelAutoLoginOnInteraction();
    const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const logout = target?.closest?.('a.dropdown-item.ddip-card.d-flex.justify-content-between[href="#"]');
    if (logout?.firstElementChild?.textContent.trim().toLocaleUpperCase('pt-BR') === 'SAIR') {
      GM_setValue(AUTO_LOGIN_LOGOUT_KEY, true);
      setManualLoginPending(false);
      autoLoginAttempted = true;
      cancelAutoLoginTask();
      return;
    }
    if (target?.closest?.('button[type="submit"]') === getLoginControls()?.submit) {
      markManualLoginSubmission();
    }
  }, true);

























  function isKlingoHost() {
    return location.hostname === 'klingo.app' || location.hostname.endsWith('.klingo.app');
  }

  function injectDateCalculatorCSS() {
    if (document.getElementById('tm-datecalc-style')) return;

    const style = document.createElement('style');
    style.id = 'tm-datecalc-style';
    style.textContent = `
      .tm-datecalc-panel {
        position: fixed;
        top: 0;
        left: 0;
        width: 360px;
        max-width: calc(100vw - 24px);
        background: #ffffff;
        border: 1px solid #d7dbe2;
        border-radius: 10px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.18);
        z-index: 999995;
        overflow: hidden;
      }

      .tm-datecalc-hidden {
        display: none !important;
      }

      .tm-datecalc-body {
        padding: 14px;
      }

      .tm-datecalc-section + .tm-datecalc-section {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid #e7ebf0;
      }

      .tm-datecalc-grid {
        display: grid;
        grid-template-columns: 1fr 112px;
        gap: 10px 12px;
        align-items: end;
      }

      .tm-datecalc-field {
        min-width: 0;
      }

      .tm-datecalc-field label {
        display: block;
        margin-bottom: 6px;
        color: #6c757d;
        font-size: 13px;
        line-height: 1.2;
      }


      .tm-datecalc-field input[type="date"]::-webkit-calendar-picker-indicator {
        display: none !important;
        opacity: 0 !important;
      }

      .tm-datecalc-hoje-btn {
        height: 38px;
        padding: 0 10px;
        margin-left: 6px;
        border: 1px solid #ced4da;
        border-radius: .25rem;
        background: #f1f3f5;
        cursor: pointer;
        font-size: 13px;
      }

      .tm-datecalc-field input {
        width: 100%;
        height: 38px;
        border: 1px solid #ced4da;
        border-radius: .25rem;
        padding: 6px 10px;
        font-size: 15px;
        line-height: 1.2;
        color: #495057;
        background: #fff;
        box-sizing: border-box;
      }

      .tm-datecalc-field input:focus {
        outline: none;
        border-color: #80bdff;
        box-shadow: 0 0 0 .2rem rgba(0,123,255,.15);
      }

      .tm-datecalc-result-box,
      .tm-datecalc-days-box {
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 46px;
        margin-top: 12px;
        padding: 10px 12px;
        border: 1px solid #d9dee5;
        border-radius: 8px;
        background: #f7f9fb;
        text-align: center;
        box-sizing: border-box;
        color: #212529;
        font-size: 16px;
        font-weight: 400;
        line-height: 1.35;
      }

      .tm-datecalc-result-box {
        position: relative;
        padding-right: 46px;
      }

      .tm-datecalc-result-value {
        flex: 1 1 auto;
        min-width: 0;
        text-align: center;
      }

      .tm-datecalc-copy-result {
        position: absolute;
        right: 8px;
        top: 50%;
        transform: translateY(-50%);
        width: 30px;
        height: 30px;
        border: 1px solid #ced4da;
        border-radius: 7px;
        background: #ffffff;
        color: #495057;
        font-size: 15px;
        line-height: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        opacity: 0.88;
      }

      .tm-datecalc-copy-result:hover,
      .tm-datecalc-copy-result:focus {
        opacity: 1;
        background: #eef5ff;
        border-color: #80bdff;
      }

      .tm-datecalc-copy-result:disabled {
        cursor: default;
        opacity: 0.35;
      }

      .tm-datecalc-result-box small {
        display: block;
        margin-top: 2px;
        color: #6c757d;
        font-weight: 500;
      }

      [data-tm-datecalc-item="1"] {
        cursor: pointer !important;
      }

      .tm-datecalc-header-trigger-item {
        display: flex !important;
        align-items: center !important;
      }

      .tm-datecalc-header-trigger {
        position: relative !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 38px !important;
        height: 38px !important;
        min-width: 38px !important;
        min-height: 38px !important;
        padding: 0 !important;
        margin: 0 14px 0 0 !important;
        border-radius: 13px !important;
        border: 1px solid rgba(255,255,255,0.34) !important;
        background: rgba(255,255,255,0.12) !important;
        color: #ffffff !important;
        line-height: 1 !important;
        text-decoration: none !important;
        cursor: pointer !important;
        user-select: none !important;
        flex: 0 0 auto !important;
        overflow: hidden !important;
        box-shadow: 0 4px 10px rgba(0,0,0,0.10) !important;
        backdrop-filter: blur(5px) !important;
        -webkit-backdrop-filter: blur(5px) !important;
        transition:
          transform 0.16s ease,
          background 0.16s ease,
          border-color 0.16s ease,
          box-shadow 0.16s ease,
          opacity 0.16s ease !important;
      }

      .tm-datecalc-header-trigger::before {
        content: '' !important;
        position: absolute !important;
        inset: 0 !important;
        border-radius: inherit !important;
        background: linear-gradient(135deg, rgba(255,255,255,0.24), rgba(255,255,255,0.06)) !important;
        opacity: 0 !important;
        transition: opacity 0.16s ease !important;
        pointer-events: none !important;
      }

      .tm-datecalc-header-trigger .tm-datecalc-trigger-icon {
        position: relative !important;
        z-index: 1 !important;
        display: block !important;
        font-size: 20px !important;
        filter: drop-shadow(0 1px 1px rgba(0,0,0,0.22)) !important;
        transition: transform 0.16s ease, filter 0.16s ease !important;
      }

      #tm-script-update-link .tm-datecalc-trigger-icon {
        font-size: 24px !important;
      }

      .tm-datecalc-header-trigger:hover,
      .tm-datecalc-header-trigger:focus {
        color: #ffffff !important;
        text-decoration: none !important;
        opacity: 1 !important;
        background: rgba(255,255,255,0.22) !important;
        border-color: rgba(255,255,255,0.58) !important;
        box-shadow: 0 7px 16px rgba(0,0,0,0.18) !important;
        transform: translateY(-1px) !important;
      }

      .tm-datecalc-header-trigger:hover::before,
      .tm-datecalc-header-trigger:focus::before {
        opacity: 1 !important;
      }

      .tm-datecalc-header-trigger:hover .tm-datecalc-trigger-icon,
      .tm-datecalc-header-trigger:focus .tm-datecalc-trigger-icon {
        transform: none !important;
        filter: drop-shadow(0 2px 2px rgba(0,0,0,0.26)) !important;
      }

      .tm-datecalc-header-trigger:active {
        transform: translateY(0) !important;
        box-shadow: 0 3px 8px rgba(0,0,0,0.12) !important;
      }


      /* TM FIX 13.4 - remover tooltip do botão copiar calculadora */
      .tm-datecalc-copy-btn,
      .tm-datecalc-copy-result,
      [data-tm-datecalc-copy="1"] {
        position: relative !important;
      }

      .tm-datecalc-copy-btn::before,
      .tm-datecalc-copy-btn::after,
      .tm-datecalc-copy-result::before,
      .tm-datecalc-copy-result::after,
      [data-tm-datecalc-copy="1"]::before,
      [data-tm-datecalc-copy="1"]::after {
        display: none !important;
        content: none !important;
      }

      .tooltip:empty,
      .tooltip .tooltip-inner:empty {
        display: none !important;
      }


      /* FIX 13.5 - posição correta botão copiar */
      .tm-datecalc-result-box {
        position: relative !important;
      }

      .tm-datecalc-copy-btn,
      .tm-datecalc-copy-result {
        position: absolute !important;
        right: 10px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
      }
`;
    document.head.appendChild(style);
  }


  function getDateCalculatorPanel() {
    return document.getElementById('tm-datecalc-panel');
  }

  function ensureDateCalculatorPanel() {
    let panel = getDateCalculatorPanel();
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'tm-datecalc-panel';
    panel.className = 'tm-datecalc-panel tm-datecalc-hidden';
    panel.innerHTML = `      <div class="tm-datecalc-body">
        <div class="tm-datecalc-section">
          <div class="tm-datecalc-grid">
            <div class="tm-datecalc-field">
              <label for="tm-datecalc-start">Data do pedido médico</label>
              <div style="display:flex;align-items:center;">
              <input id="tm-datecalc-start" type="date" style="flex:1;">
              <button type="button" class="tm-datecalc-hoje-btn" data-tm-hoje="1">Hoje</button>
            </div>
            </div>
            <div class="tm-datecalc-field">
              <label for="tm-datecalc-days">Prazo do convênio</label>
              <input id="tm-datecalc-days" type="number" step="1" placeholder="">
            </div>
          </div>
          <div class="tm-datecalc-field tm-datecalc-result-field-final" style="grid-column: 1 / -1;">
            <label for="tm-datecalc-result-date">Validade do pedido médico</label>
            <div class="tm-datecalc-result-box"><span class="tm-datecalc-result-value" id="tm-datecalc-result-date"></span><button type="button" class="tm-datecalc-copy-result" data-tm-copy-date-result="1" title="Copiar resultado" aria-label="Copiar resultado" disabled>📋</button></div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(panel);
    return panel;
  }


  function positionDateCalculatorPanel() {
    const panel = document.getElementById('tm-datecalc-panel');
    const trigger = document.querySelector('[data-tm-datecalc-header-trigger="1"]');
    if (!panel || !trigger) return;

    const rect = trigger.getBoundingClientRect();

    let top = rect.bottom + 6;
    if (top + panel.offsetHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - panel.offsetHeight - 6);
    }
    const left = Math.min(
      Math.max(12, rect.left - 280),
      Math.max(12, window.innerWidth - panel.offsetWidth - 12)
    );
    panel.style.top = `${top}px`;
    panel.style.left = `${left}px`;
  }

function setDateCalculatorOpen(isOpen) {
    const panel = ensureDateCalculatorPanel();
    panel.classList.toggle('tm-datecalc-hidden', !isOpen);
    if (isOpen) positionDateCalculatorPanel();

    if (isOpen) document.dispatchEvent(new Event('tm-datecalc-opened'));

    if (!isOpen) {
      panel.querySelectorAll('#tm-datecalc-start, #tm-datecalc-days, #tm-datecalc-end')
        .forEach((input) => {
          input.value = '';
          input.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

    if (isOpen) {
      const startInput = panel.querySelector('#tm-datecalc-start');
      if (startInput) startInput.focus();
    }
  }

  function toggleDateCalculatorPanel() {
    const panel = ensureDateCalculatorPanel();
    setDateCalculatorOpen(panel.classList.contains('tm-datecalc-hidden'));
  }

  function parseIsoDateSafe(value) {
    const iso = tmParseDateInput(value);
    if (!iso) return null;
    const [year, month, day] = iso.split('-').map(Number);
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(12, 0, 0, 0);
    return date;
  }
  function addDaysSafe(date, days) {
    const amount = Number(days);
    if (!(date instanceof Date) || !Number.isSafeInteger(amount) || amount < 0) return null;
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount, 12, 0, 0, 0);
    return Number.isNaN(result.getTime()) ? null : result;
  }

  function formatDatePtBrShort(date) {
    if (!(date instanceof Date)) return '';
    const day = String(date.getDate());
    const month = monthNameFromNumber(String(date.getMonth() + 1).padStart(2, '0'));
    const year = date.getFullYear();
    return `${day} de ${month} de ${year}`;
  }

  function refreshDateCalculatorResults() {
    const panel = getDateCalculatorPanel();
    if (!panel) return;

    const startInput = panel.querySelector('#tm-datecalc-start');
    const daysInput = panel.querySelector('#tm-datecalc-days');
    const resultDate = panel.querySelector('#tm-datecalc-result-date');
    const copyDateBtn = panel.querySelector('[data-tm-copy-date-result="1"]');

    if (!startInput || !daysInput || !resultDate) return;

    const startDate = parseIsoDateSafe(startInput.value);
    const daysValue = norm(daysInput.value);
    let validResult = false;

    if (startDate && /^\d+$/.test(daysValue) && Number.isSafeInteger(Number(daysValue))) {
      const targetDate = addDaysSafe(startDate, Number(daysValue));
      resultDate.textContent = targetDate
        ? formatDatePtBrShort(targetDate)
        : 'Não foi possível calcular a data.';
      validResult = !!targetDate;
    } else {
      resultDate.textContent = '';
    }

    if (copyDateBtn) {
      copyDateBtn.disabled = !validResult;
    }
  }


  function getDisplayVersion() {
    return typeof GM_info !== 'undefined' && GM_info.script?.version || '26';
  }

  function ensureScriptUpdateLink(navbar) {
    let link = navbar.querySelector('#tm-script-update-link');
    if (!link) {
      link = document.createElement('a');
      link.id = 'tm-script-update-link';
      link.className = 'nav-link tm-datecalc-header-trigger';
      link.href = 'https://raw.githubusercontent.com/mtialison/klingo/main/klingo.user.js';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.title = 'Atualizar script';
      link.setAttribute('aria-label', 'Atualizar script');
      const icon = document.createElement('span');
      icon.className = 'tm-datecalc-trigger-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.textContent = '🐒';
      link.appendChild(icon);
      link.style.setProperty('position', 'absolute', 'important');
      link.style.setProperty('left', 'calc(50% + 36px)', 'important');
      link.style.setProperty('top', '50%', 'important');
      link.style.setProperty('transform', 'translateY(-50%)', 'important');
      link.style.setProperty('margin', '0', 'important');
      link.style.setProperty('z-index', '5', 'important');
      navbar.appendChild(link);
    }
  }

  function ensureScriptVersionIndicator() {
    const navbar = document.querySelector('nav.navbar');
    if (!navbar) return;

    navbar.style.setProperty('position', 'relative', 'important');
    navbar.style.setProperty('background', '#116045', 'important');

    let indicator = navbar.querySelector('#tm-script-version-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'tm-script-version-indicator';
      indicator.className = 'tm-script-version-indicator';
    }

    const expected = String(getDisplayVersion());
    if (indicator.textContent !== expected) {
      indicator.textContent = expected;
    }

    const companyText = navbar.querySelector('.text-white');

    indicator.style.setProperty('position', 'absolute', 'important');
    indicator.style.setProperty('left', '50%', 'important');
    indicator.style.setProperty('top', '50%', 'important');
    indicator.style.setProperty('transform', 'translate(-50%, -50%)', 'important');
    indicator.style.setProperty('z-index', '4', 'important');
    indicator.style.setProperty('color', '#ffffff', 'important');
    indicator.style.setProperty('white-space', 'nowrap', 'important');
    indicator.style.setProperty('pointer-events', 'none', 'important');

    if (companyText) {
      const cs = window.getComputedStyle(companyText);
      indicator.style.setProperty('font-size', cs.fontSize, 'important');
      indicator.style.setProperty('line-height', cs.lineHeight, 'important');
      indicator.style.setProperty('font-weight', cs.fontWeight, 'important');
      indicator.style.setProperty('font-family', cs.fontFamily, 'important');
    } else {
      indicator.style.setProperty('font-size', '14px', 'important');
      indicator.style.setProperty('line-height', '1', 'important');
      indicator.style.setProperty('font-weight', '500', 'important');
    }

    if (indicator.parentElement !== navbar) {
      navbar.appendChild(indicator);
    }
    ensureScriptUpdateLink(navbar);
  }

  function startHeaderToolsInitialRenderSafe() {
    if (!isKlingoHost()) return;

    clearTimeout(startHeaderToolsInitialRenderSafe._timer);

    let attempts = 0;
    const maxAttempts = 24;

    const run = () => {
      attempts += 1;

      ensureDateCalculatorHeaderTrigger();
      ensureScriptVersionIndicator();

      const hasCalculator = !!document.querySelector('[data-tm-datecalc-header-trigger="1"]');
      const hasVersion = !!document.querySelector('#tm-script-version-indicator');

      if (hasCalculator && hasVersion) return;
      if (attempts >= maxAttempts) return;

      startHeaderToolsInitialRenderSafe._timer = setTimeout(run, 250);
    };

    run();
  }

  function getDateCalculatorHeaderHost() {
    return document.querySelector('nav.navbar ul.navbar-nav.ml-auto');
  }

  function ensureDateCalculatorHeaderTrigger() {
    const host = getDateCalculatorHeaderHost();
    if (!host) return;

    if (host.querySelector('[data-tm-datecalc-header-trigger="1"]')) return;

    const patientItem = host.querySelector('li');
    const triggerLi = document.createElement('li');
    triggerLi.className = 'nav-item tm-datecalc-header-trigger-item';

    const trigger = document.createElement('a');
    trigger.href = '#';
    trigger.className = 'nav-link tm-datecalc-header-trigger';
    trigger.setAttribute('data-tm-datecalc-header-trigger', '1');
    trigger.setAttribute('title', 'Calculadora de datas');
    trigger.setAttribute('aria-label', 'Calculadora de datas');
    const icon = document.createElement('span');
    icon.className = 'tm-datecalc-trigger-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '🧮';
    trigger.appendChild(icon);

    triggerLi.appendChild(trigger);

    if (patientItem) {
      host.insertBefore(triggerLi, patientItem);
    } else {
      host.appendChild(triggerLi);
    }
  }

  function scheduleDateCalculatorMenuRefresh() {
    if (!isKlingoHost()) return;
    clearTimeout(scheduleDateCalculatorMenuRefresh._timer);
    scheduleDateCalculatorMenuRefresh._timer = setTimeout(() => {
      ensureDateCalculatorHeaderTrigger();
      ensureScriptVersionIndicator();
    }, 120);
  }

  function bindDateCalculatorEvents() {
    document.querySelectorAll('.tm-datecalc-copy-btn, .tm-datecalc-copy-result, [data-tm-datecalc-copy="1"]').forEach(tmDateCalcDisableCopyTooltip);

    if (document.body.dataset.tmDatecalcBound === '1') return;
    document.body.dataset.tmDatecalcBound = '1';

    document.addEventListener('click', (e) => {
      if (!(e.target instanceof Element)) return;
      const headerTrigger = e.target.closest('[data-tm-datecalc-header-trigger="1"]');
      if (headerTrigger) {
        e.preventDefault();
        e.stopPropagation();
        toggleDateCalculatorPanel();
        return;
      }

      const menuItem = e.target.closest('[data-tm-datecalc-item="1"]');
      if (menuItem) {
        e.preventDefault();
        e.stopPropagation();
        toggleDateCalculatorPanel();
        return;
      }

      const panel = getDateCalculatorPanel();
      if (panel && !panel.classList.contains('tm-datecalc-hidden') && !panel.contains(e.target)) {
        setDateCalculatorOpen(false);
      }

      const copyDateResultBtn = e.target.closest('[data-tm-copy-date-result="1"]');
      if (copyDateResultBtn) {
        e.preventDefault();
        e.stopPropagation();

        const resultDate = document.getElementById('tm-datecalc-result-date');
        const textToCopy = norm(resultDate ? resultDate.textContent : '');
        if (textToCopy) {
          copyText(textToCopy, copyDateResultBtn);
        }
        return;
      }

      const hojeEndBtn = e.target.closest('[data-tm-hoje-end="1"]');
      if (hojeEndBtn) {
        e.preventDefault();
        const input = document.getElementById('tm-datecalc-end');
        if (input) {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth()+1).padStart(2,'0');
          const dd = String(today.getDate()).padStart(2,'0');
          input.value = `${yyyy}-${mm}-${dd}`;
          input.dispatchEvent(new Event('input', {bubbles:true}));
        }
        return;
      }

      const hojeBtn = e.target.closest('[data-tm-hoje="1"]');
      if (hojeBtn) {
        e.preventDefault();
        const input = document.getElementById('tm-datecalc-start');
        if (input) {
          const today = new Date();
          const yyyy = today.getFullYear();
          const mm = String(today.getMonth()+1).padStart(2,'0');
          const dd = String(today.getDate()).padStart(2,'0');
          input.value = `${yyyy}-${mm}-${dd}`;
          input.dispatchEvent(new Event('input', {bubbles:true}));
        }
        return;
      }

      const avatarToggle = e.target.closest('#navbarDropdown');
      if (avatarToggle) {
        scheduleDateCalculatorMenuRefresh();
        setTimeout(scheduleDateCalculatorMenuRefresh, 80);
        setTimeout(scheduleDateCalculatorMenuRefresh, 180);
        setTimeout(scheduleDateCalculatorMenuRefresh, 320);
        return;
      }

      scheduleDateCalculatorMenuRefresh();
    }, true);

    document.addEventListener('input', (e) => {
      if (!(e.target instanceof Element) || !e.target.closest('#tm-datecalc-panel')) return;
      refreshDateCalculatorResults();
    }, true);

    document.addEventListener('change', (e) => {
      if (!(e.target instanceof Element) || !e.target.closest('#tm-datecalc-panel')) return;
      refreshDateCalculatorResults();
    }, true);

    window.addEventListener('resize', positionDateCalculatorPanel);
    window.addEventListener('scroll', positionDateCalculatorPanel, true);

    window.addEventListener('hashchange', () => {
      scheduleDateCalculatorMenuRefresh();
      startHeaderToolsInitialRenderSafe();
    }, true);

    window.addEventListener('focus', () => {
      scheduleDateCalculatorMenuRefresh();
      startHeaderToolsInitialRenderSafe();
    }, true);
  }


  function tmDateCalcDisableCopyTooltip(btn) {
    if (!btn) return;

    btn.removeAttribute('title');
    btn.removeAttribute('data-title');
    btn.removeAttribute('data-toggle');
    btn.removeAttribute('data-placement');
    btn.removeAttribute('data-original-title');
    btn.removeAttribute('aria-describedby');
    btn.dataset.tmDatecalcCopy = '1';

    try {
      if (window.jQuery) {
        window.jQuery(btn).tooltip('dispose');
        window.jQuery(btn).popover('dispose');
      }
    } catch (e) {}

    document.querySelectorAll('.tooltip, .popover').forEach((el) => {
      const inner = el.querySelector('.tooltip-inner, .popover-body');
      const raw = (inner ? inner.textContent : el.textContent || '').trim();

      if (!raw || raw === 'Copiado' || raw === 'Copiar') {
        el.remove();
      }
    });
  }

  document.addEventListener('click', (event) => {
    const btn = event.target?.closest?.('.tm-datecalc-copy-btn, .tm-datecalc-copy-result, [data-tm-datecalc-copy="1"]');
    if (!btn) return;
    tmDateCalcDisableCopyTooltip(btn);
    setTimeout(() => tmDateCalcDisableCopyTooltip(btn), 0);
  }, true);

  function tmDateCalcMarkCopied(btn) {
    if (!btn || !tmDateCalcIsOwnCopyButton(btn)) return;
    tmDateCalcDisableCopyTooltip(btn);

    btn.textContent = '✅';
    btn.setAttribute('aria-label', 'Copiado');

    clearTimeout(btn._tmDatecalcCopiedTimer);
    btn._tmDatecalcCopiedTimer = setTimeout(() => {
      btn.textContent = '📋';
      btn.setAttribute('aria-label', 'Copiar');
      tmDateCalcDisableCopyTooltip(btn);
    }, 1200);
  }


  function initDateCalculatorFeature() {
    if (!isKlingoHost()) return;
    injectDateCalculatorCSS();
    ensureDateCalculatorPanel();
    ensureDateCalculatorHeaderTrigger();
    ensureScriptVersionIndicator();
    bindDateCalculatorEvents();
    refreshDateCalculatorResults();
    scheduleDateCalculatorMenuRefresh();
    setTimeout(() => {
      ensureDateCalculatorHeaderTrigger();
      ensureScriptVersionIndicator();
    }, 120);
    setTimeout(() => {
      ensureDateCalculatorHeaderTrigger();
      ensureScriptVersionIndicator();
    }, 300);
    setTimeout(() => {
      ensureDateCalculatorHeaderTrigger();
      ensureScriptVersionIndicator();
    }, 700);

    startHeaderToolsInitialRenderSafe();
  }

  tmRuntime.register('indicador de login', applyLoginIndicator);
  tmRuntime.register('limpeza dos bloqueios após login', clearLoginMarkersAfterSuccess);
  tmRuntime.register('login por credencial salva', tryAutoLoginWithSavedCredential);

  function initScript() {
    applyLoginIndicator();
    initDateCalculatorFeature();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initScript);
  } else {
    initScript();
  }

  window.addEventListener('load', initScript);
  window.addEventListener('pageshow', initScript);
  window.addEventListener('focus', () => {
    applyLoginIndicator();
  });
  window.addEventListener('hashchange', initScript);

/* =========================
   NOTIFICAÇÃO VISUAL E SONORA - NOVA MENSAGEM
   alertas nativos de mensagens e coordenação entre abas
========================= */
(function(){
  const OWNER_KEY = 'klingo_message_alert_owner_v1';
  const DISMISS_KEY = 'klingo_message_alert_dismiss_v1';
  const ALERT_EVENT_KEY = 'klingo_message_alert_event_v1';
  const ALERT_HISTORY_KEY = 'klingo_message_alert_history_v1';
  const ALERT_DEDUP_TTL = 2000;
  const ALERT_ID_TTL = 300000;
  const OPEN_CHAT_PREFIX = 'klingo_chat_open_sender_v1:';
  const FOCUS_PREFIX = 'klingo_tab_focus_v1:';
  const FOCUS_TTL = 3000;
  const OWNER_TTL = 7000;
  const DISMISS_TTL = 30000;
  const OPEN_CHAT_TTL = 90000;
  const tabId = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
  let originalTitle = document.title;
  let blinking = false;
  let blinkInterval = null;
  let claimTimer = null;
  let dismissalSequence = 0;
  let alertSequence = 0;
  let knownToastCounts = new Map();
  let pendingChatSender = '';
  let publishedSenderKey = '';
  let lastPresenceWrite = 0;
  let recentNativeSender = '';
  let recentNativeSenderAt = 0;
  const nativeNotificationAudio = new Map();
  let notificationAudioContext = null;
  let nextAlertToneAt = 0;
  const pendingAlertTones = new Set();
  let hookedChatVue = null;
  let nativeChatHooked = false;
  let openChatContent = null;
  let openChatSender = '';
  let knownChatRows = [];
  const knownToastElements = new WeakMap();
  const pendingDismissals = [];
  const closingToasts = new WeakSet();

  function normalizeToastText(toast) {
    const message = Array.from(toast.childNodes)
      .filter((node) => node.nodeType === Node.TEXT_NODE)
      .map((node) => node.textContent)
      .join(' ')
      .replace(/\s+/g, ' ').trim();
    return message || toast.textContent.replace(/\s*(Fechar|Chat)\s*$/gi, '').replace(/\s+/g, ' ').trim();
  }

  function messageKey(text) {
    let hash = 2166136261;
    for (let index = 0; index < text.length; index++) {
      hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
    }
    return `${text.length}:${(hash >>> 0).toString(16)}`;
  }

  function toastSender(toast) {
    return normalizeSender(normalizeToastText(toast).match(/^De:\s*(.*?)\s*>>/i)?.[1]);
  }

  function normalizeSender(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
  }

  function directChatSender() {
    const textarea = Array.from(document.querySelectorAll(
      '.modal.show .modal-footer.d-flex.flex-column textarea')).find((item) =>
      item.closest('.modal-footer')?.querySelector('.fa-paper-plane'));
    const content = textarea?.closest('.modal-content');
    if (!content) return '';
    const header = normalizeSender(content.querySelector('.modal-header .modal-title')?.textContent ||
      content.querySelector('.modal-header')?.textContent)
      .replace(/^CHAT\s*(?:COM|:|[-–])\s*/i, '');
    if (pendingChatSender &&
        (header === pendingChatSender || header.includes(pendingChatSender))) return pendingChatSender;
    return header && header !== 'CHAT' ? header : '';
  }

  function syncOpenChat() {
    const sender = directChatSender();
    const senderKey = sender ? messageKey(sender) : '';
    const now = Date.now();
    try {
      if (!senderKey) {
        if (publishedSenderKey) localStorage.removeItem(OPEN_CHAT_PREFIX + tabId);
        publishedSenderKey = '';
        return;
      }
      if (senderKey !== publishedSenderKey || now - lastPresenceWrite >= 5000) {
        localStorage.setItem(OPEN_CHAT_PREFIX + tabId,
          JSON.stringify({ senderKey, account: alertAccountId(), at: now }));
        publishedSenderKey = senderKey;
        lastPresenceWrite = now;
      }
    } catch (_) {
      // Sem armazenamento compartilhado, mantenha os avisos em vez de ocultá-los às cegas.
      publishedSenderKey = '';
    }
  }

  function isChatOpen(sender) {
    if (!sender) return false;
    const senderKey = messageKey(sender);
    try {
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key?.startsWith(OPEN_CHAT_PREFIX)) continue;
        const presence = JSON.parse(localStorage.getItem(key) || 'null');
        if (presence?.senderKey === senderKey && presence.account === alertAccountId() &&
            Number.isFinite(presence.at) &&
            Date.now() - presence.at >= 0 && Date.now() - presence.at < OPEN_CHAT_TTL) return true;
      }
    } catch (_) {
      return false;
    }
    return false;
  }

  function alertAccountId() {
    for (let node = document.querySelector('nav.navbar'); node; node = node.parentElement) {
      const id = node.__vue__?.$store?.state?.user?.id_usuario;
      if (id) return String(id);
    }
    const initials = document.querySelector('nav.navbar [data-initials]')
      ?.getAttribute('data-initials')?.trim().toLocaleUpperCase('pt-BR');
    return initials ? `avatar:${initials}` : '';
  }

  function syncGlobalFocus() {
    try {
      const key = FOCUS_PREFIX + tabId;
      if (document.visibilityState === 'visible' && document.hasFocus()) {
        localStorage.setItem(key, JSON.stringify({ at: Date.now() }));
      } else localStorage.removeItem(key);
    } catch (_) {}
  }

  function isAnyKlingoTabFocused() {
    let focusedTabs = 0;
    try {
      for (let index = 0; index < localStorage.length; index++) {
        const key = localStorage.key(index);
        if (!key?.startsWith(FOCUS_PREFIX)) continue;
        const state = JSON.parse(localStorage.getItem(key) || 'null');
        if (Number.isFinite(state?.at) && Date.now() - state.at >= 0 &&
            Date.now() - state.at < FOCUS_TTL) focusedTabs++;
      }
    } catch (_) {}
    // Uma janela do Chrome só pode entregar foco real a uma aba por vez.
    // Múltiplos heartbeats simultâneos indicam estado emulado/inconsistente.
    return focusedTabs === 1;
  }

  function armScriptAudio() {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    try {
      notificationAudioContext ||= new AudioContextClass();
      if (notificationAudioContext.state === 'suspended') {
        notificationAudioContext.resume().catch(() => {});
      }
    } catch (_) {}
  }

  function playScriptAlert() {
    // O Chrome exige uma interação prévia com o site para liberar Web Audio.
    // Não guarde alertas bloqueados para tocar somente ao voltar à aba.
    if (notificationAudioContext?.state !== 'running') return;
    try {
      const context = notificationAudioContext;
      const start = Math.max(context.currentTime, nextAlertToneAt);
      const oscillator = context.createOscillator();
      const volume = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      volume.gain.setValueAtTime(0.0001, start);
      volume.gain.exponentialRampToValueAtTime(0.12, start + 0.015);
      volume.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      oscillator.connect(volume);
      volume.connect(context.destination);
      pendingAlertTones.add(oscillator);
      oscillator.onended = () => {
        pendingAlertTones.delete(oscillator);
        oscillator.disconnect();
        volume.disconnect();
      };
      oscillator.start(start);
      oscillator.stop(start + 0.18);
      nextAlertToneAt = start + 0.24;
    } catch (error) {
      console.warn('[TM] Falha no som de mensagem do userscript', error);
    }
  }

  function handleNativeChatPlay(event) {
    const audio = event.target;
    if (audio.id !== 'beepChatId' && audio.id !== 'beepPagId') return;
    audio.muted = true;
    audio.pause();
    try { audio.currentTime = 0; } catch (_) {}
  }

  function syncNativeChatAudio() {
    for (const id of ['beepChatId', 'beepPagId']) {
      const audio = document.getElementById(id);
      if (!audio) continue;
      const previous = nativeNotificationAudio.get(id);
      if (audio !== previous) {
        previous?.removeEventListener('play', handleNativeChatPlay);
        nativeNotificationAudio.set(id, audio);
        audio.addEventListener('play', handleNativeChatPlay);
      }
      audio.muted = true;
      if (!audio.paused) audio.pause();
    }
  }

  function syncNativeMessageHook() {
    let vue = null;
    for (let node = document.getElementById('modalChat'); node; node = node.parentElement) {
      if (typeof node.__vue__?.receberMensagem === 'function') {
        vue = node.__vue__;
        break;
      }
    }
    nativeChatHooked = !!vue;
    if (!vue || (hookedChatVue === vue && vue.receberMensagem.__tmAlertHook)) return;
    if (vue.receberMensagem.__tmAlertHook) {
      hookedChatVue = vue;
      return;
    }
    const original = vue.receberMensagem;
    const wrapped = function (message) {
      const result = original.apply(this, arguments);
      try {
        const id = message?.id_chat_sala_mensagem;
        const sender = normalizeSender(message?.from_name || message?.from);
        if (id !== null && id !== undefined && id !== '') {
          publishChatAlert({ sender, source: 'native', key: `id:${id}` });
        } else if (sender) {
          publishChatAlert({ sender, source: 'native',
            key: `fallback:${messageKey(`${sender}\u0000${message?.text || ''}`)}` });
        }
      } catch (error) {
        console.warn('[TM] Falha ao identificar mensagem recebida', error);
      }
      return result;
    };
    wrapped.__tmAlertHook = true;
    vue.receberMensagem = wrapped;
    hookedChatVue = vue;
  }

  function publishChatAlert(event) {
    if (event.source === 'toast' && isChatOpen(event.sender)) return;
    syncGlobalFocus();
    if (isAnyKlingoTabFocused()) return;
    const account = alertAccountId();
    if (!account || typeof navigator === 'undefined' || !navigator.locks?.request) return;
    const run = () => {
      if (!isOwner() || isAnyKlingoTabFocused()) return;
      const key = event.key || event.sender;
      const origin = event.source === 'relay' ? event.origin : tabId;
      const historyKey = `${ALERT_HISTORY_KEY}:${account}`;
      const history = new Map(GM_getValue(historyKey, []) || []);
      const previous = history.get(key);
      const ttl = String(key).startsWith('id:') ? ALERT_ID_TTL : ALERT_DEDUP_TTL;
      if (previous && (String(key).startsWith('id:') || previous.origin !== origin) &&
          Date.now() - previous.at < ttl) return;
      history.set(key, { origin, at: Date.now() });
      for (const [oldKey, state] of history) {
        const oldTtl = String(oldKey).startsWith('id:') ? ALERT_ID_TTL : ALERT_DEDUP_TTL;
        if (Date.now() - state.at > oldTtl) history.delete(oldKey);
      }
      GM_setValue(historyKey, Array.from(history));
      startBlink();
      playScriptAlert();
    };
    if (isOwner()) return navigator.locks.request(`klingo-chat-owner-v1:${account}`, run)
      .catch(() => {});
    const owner = readOwner();
    if (owner && Date.now() - owner.updatedAt < OWNER_TTL) {
      if (event.source !== 'relay') GM_setValue(ALERT_EVENT_KEY, {
        id: `${tabId}:${++alertSequence}`, account, key: event.key || event.sender,
        at: Date.now(), source: tabId
      });
      return;
    }
    return navigator.locks.request(`klingo-chat-owner-v1:${account}`, () => {
      claimOwner();
      if (isOwner()) run();
      else if (event.source !== 'relay') GM_setValue(ALERT_EVENT_KEY, {
        id: `${tabId}:${++alertSequence}`, account, key: event.key || event.sender,
        at: Date.now(), source: tabId
      });
    }).catch(() => {});
  }

  function detectChatRows(content, sender, rows) {
    if (content === openChatContent && sender === openChatSender) {
      let overlap = Math.min(knownChatRows.length, rows.length);
      while (overlap && !knownChatRows.slice(-overlap).every((oldRow, index) =>
        oldRow.key === rows[index].key)) overlap--;
      for (const row of rows.slice(overlap)) {
        if (row.incoming) publishChatAlert({ sender, source: 'chat', key: messageKey(row.key) });
      }
    }
    openChatContent = content;
    openChatSender = sender;
    knownChatRows = rows;
  }

  function scanOpenChatMessages() {
    const textarea = Array.from(document.querySelectorAll(
      '.modal.show .modal-footer.d-flex.flex-column textarea')).find((item) =>
      item.closest('.modal-footer')?.querySelector('.fa-paper-plane'));
    const content = textarea?.closest('.modal-content');
    const sender = content ? directChatSender() : '';
    if (!content || !sender) {
      detectChatRows(null, '', []);
      return;
    }
    const rows = Array.from(content.querySelectorAll('.modal-body li.list-group-item'))
      .map((item) => {
        const header = item.querySelector('.small')?.textContent || '';
        const body = item.lastElementChild?.textContent || '';
        return { item, incoming: item.classList.contains('list-group-item-secondary'),
          key: `${header} ${body}`.replace(/\s+/g, ' ').trim() };
      });
    detectChatRows(content, sender, rows);
  }

  function detectNewToasts(toasts, baseline = false) {
    const current = countMessageToasts(toasts);
    for (const toast of toasts) {
      const signature = normalizeToastText(toast);
      if (knownToastElements.get(toast) === signature) continue;
      knownToastElements.set(toast, signature);
    }
    if (!baseline) {
      const seen = new Map();
      for (const toast of toasts) {
        const signature = normalizeToastText(toast);
        const key = messageKey(signature);
        const occurrence = (seen.get(key) || 0) + 1;
        seen.set(key, occurrence);
        if (occurrence <= (knownToastCounts.get(key) || 0)) continue;
        const sender = toastSender(toast);
        if (sender) publishChatAlert({ sender, source: 'toast', key });
      }
    }
    knownToastCounts = current;
  }

  function dismissCoveredToasts(toasts) {
    for (const toast of toasts) {
      if (closingToasts.has(toast)) continue;
      if (!isChatOpen(toastSender(toast))) continue;
      const sender = toastSender(toast);
      toast.style.display = 'none';
      toast.dataset.tmCovered = '1';
      closingToasts.add(toast);
      document.dispatchEvent(new CustomEvent('tm-chat-covered-message', { detail: { sender } }));
      findToastAction(toast, 'FECHAR')?.click();
      window.setTimeout(() => { if (toast.isConnected) toast.remove(); }, 300);
    }
  }

  function findToastAction(toast, label) {
    return Array.from(toast.querySelectorAll('*')).find((element) =>
      element.textContent.trim().toLocaleUpperCase('pt-BR') === label &&
      !Array.from(element.children).some((child) =>
        child.textContent.trim().toLocaleUpperCase('pt-BR') === label));
  }

  function isRecentDismissal(dismissal) {
    return dismissal && Number.isFinite(dismissal.at) &&
      Date.now() - dismissal.at >= 0 && Date.now() - dismissal.at < DISMISS_TTL;
  }

  function applyDismissal(dismissal) {
    if (!isRecentDismissal(dismissal)) return false;
    const matches = Array.from(document.querySelectorAll('.toasted.toastnafrente'))
      .filter((toast) => !closingToasts.has(toast) && (dismissal.action === 'CHAT' && dismissal.sender
        ? toastSender(toast) === dismissal.sender
        : messageKey(normalizeToastText(toast)) === dismissal.toastKey));
    const targets = dismissal.action === 'CHAT' && dismissal.sender
      ? matches : [matches[dismissal.ordinal] || matches[0]].filter(Boolean);
    if (!targets.length) return false;
    targets.forEach((toast) => {
      closingToasts.add(toast);
      const close = findToastAction(toast, 'FECHAR');
      close?.click();
      window.setTimeout(() => {
        if (toast.isConnected) toast.remove();
      }, 300);
    });
    return true;
  }

  function messageToasts() {
    return Array.from(document.querySelectorAll('.toasted.toastnafrente'))
      .filter((toast) => !closingToasts.has(toast) && /De:/i.test(normalizeToastText(toast)));
  }

  function countMessageToasts(toasts = messageToasts()) {
    const counts = new Map();
    toasts.forEach((toast) => {
      const key = messageKey(normalizeToastText(toast));
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return counts;
  }

  function applyPendingDismissals() {
    for (let index = pendingDismissals.length - 1; index >= 0; index--) {
      if (!isRecentDismissal(pendingDismissals[index]) || applyDismissal(pendingDismissals[index])) {
        pendingDismissals.splice(index, 1);
      }
    }
  }

  function readOwner() {
    const account = alertAccountId();
    return account ? GM_getValue(`${OWNER_KEY}:${account}`, null) : null;
  }

  function isOwner() {
    const owner = readOwner();
    return owner?.id === tabId && Date.now() - owner.updatedAt < OWNER_TTL;
  }

  function claimOwner(force = false) {
    const account = alertAccountId();
    if (!account) return;
    const owner = readOwner();
    if (!force && owner && Date.now() - owner.updatedAt < OWNER_TTL) return;
    // Ao assumir uma guia já aberta, não reapresente mensagens antigas.
    if (owner?.id !== tabId) knownToastCounts = countMessageToasts();
    GM_setValue(`${OWNER_KEY}:${account}`, { id: tabId, updatedAt: Date.now() });
    tmRuntime.schedule(0);
  }

  function scheduleTakeover() {
    if (claimTimer !== null) return;
    claimTimer = window.setTimeout(() => {
      claimTimer = null;
      const account = alertAccountId();
      if (!account) return;
      if (typeof navigator !== 'undefined' && navigator.locks?.request) {
        navigator.locks.request(`klingo-chat-owner-v1:${account}`, () => claimOwner())
          .catch(() => claimOwner());
      } else claimOwner();
    }, 150 + Math.random() * 350);
  }

  function maintainOwner() {
    const account = alertAccountId();
    if (!account) return;
    const owner = readOwner();
    if (owner?.id === tabId) {
      GM_setValue(`${OWNER_KEY}:${account}`, { id: tabId, updatedAt: Date.now() });
    } else {
      stopBlink();
      if (!owner || Date.now() - owner.updatedAt >= OWNER_TTL) scheduleTakeover();
    }
  }

  function startBlink() {
    if (blinking) return;
    blinking = true;
    blinkInterval = setInterval(() => {
      document.title = document.title === '💬 Nova mensagem'
        ? originalTitle
        : '💬 Nova mensagem';
    }, 1000);
  }

  function stopBlink() {
    for (const tone of pendingAlertTones) {
      try { tone.stop(); } catch (_) {}
    }
    pendingAlertTones.clear();
    nextAlertToneAt = 0;
    if (!blinking) return;
    blinking = false;
    clearInterval(blinkInterval);
    blinkInterval = null;
    document.title = originalTitle;
  }

  function checkMessages() {
    try {
      if (!blinking) originalTitle = document.title;
      syncGlobalFocus();
      syncOpenChat();
      syncNativeMessageHook();
      if (nativeChatHooked) {
        openChatContent = null;
        openChatSender = '';
        knownChatRows = [];
      } else scanOpenChatMessages();
      syncNativeChatAudio();
      applyPendingDismissals();
      const toasts = messageToasts();
      detectNewToasts(toasts, nativeChatHooked);
      const currentCounts = countMessageToasts(toasts);
      dismissCoveredToasts(toasts);
      if (!isOwner() || isAnyKlingoTabFocused()) stopBlink();
      knownToastCounts = currentCounts;
    } catch (error) {
      console.error('[TM] Falha no alerta de mensagens', error);
    }
  }

  const notificationObserver = new MutationObserver((mutations) => {
    const changedChat = mutations.some((mutation) => {
      const target = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target : mutation.target.parentElement;
      return !!target?.closest?.('.modal.show .modal-body li.list-group-item') ||
        Array.from(mutation.addedNodes || []).some((node) =>
          node.nodeType === Node.ELEMENT_NODE &&
          (node.matches?.('.modal.show .modal-body li.list-group-item') ||
            node.querySelector?.('.modal.show .modal-body li.list-group-item')));
    });
    if (changedChat && !nativeChatHooked) scanOpenChatMessages();
    const changedToast = mutations.some((mutation) => {
      const target = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target : mutation.target.parentElement;
      if (target?.closest?.('.toasted.toastnafrente')) return true;
      return Array.from(mutation.addedNodes || []).some((node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches?.('.toasted.toastnafrente') || node.querySelector?.('.toasted.toastnafrente')));
    });
    if (changedToast) checkMessages();
  });
  notificationObserver.observe(document.body, {
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class'],
    subtree: true
  });

  document.addEventListener('click', (event) => {
    // Cliques sintéticos feitos nas outras guias não devem ser retransmitidos.
    if (!event.isTrusted) return;
    const target = event.target?.nodeType === 1 ? event.target : event.target?.parentElement;
    const unreadRow = target?.closest('#modalChat button.list-group-item.list-group-item-action');
    const toastAction = target?.closest('.toasted.toastnafrente a.action');
    const openingSender = unreadRow ? normalizeSender(unreadRow.textContent.replace(
      unreadRow.querySelector('.badge-secondary')?.textContent || '', '')) :
      normalizeSender(toastAction?.textContent) === 'CHAT'
        ? toastSender(toastAction.closest('.toasted.toastnafrente')) : '';
    if (openingSender) {
      pendingChatSender = openingSender;
      for (const delay of [0, 100, 300]) window.setTimeout(() => {
        syncOpenChat();
        checkMessages();
      }, delay);
    }
    const unreadBadge = unreadRow?.querySelector('.badge-secondary');
    if (unreadBadge && Number(unreadBadge.textContent.trim()) > 0) {
      const sender = unreadRow.textContent.replace(unreadBadge.textContent, '')
        .replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
      if (sender) {
        // Aguarde o clique nativo abrir a conversa antes de fechar os avisos.
        window.setTimeout(() => {
          const dismissal = {
            id: `${tabId}:${++dismissalSequence}`,
            action: 'CHAT',
            sender,
            at: Date.now(),
            source: tabId
          };
          applyDismissal(dismissal);
          GM_setValue(DISMISS_KEY, dismissal);
        }, 0);
      }
      return;
    }
    const toast = target?.closest('.toasted.toastnafrente');
    if (!toast) return;

    const action = target.closest('a.action');
    const label = action?.textContent.trim().toLocaleUpperCase('pt-BR');
    if (!action || !toast.contains(action) || (label !== 'FECHAR' && label !== 'CHAT')) return;

    const toastKey = messageKey(normalizeToastText(toast));
    const ordinal = Array.from(document.querySelectorAll('.toasted.toastnafrente'))
      .filter((item) => !closingToasts.has(item) &&
        messageKey(normalizeToastText(item)) === toastKey)
      .indexOf(toast);
    const dismissal = {
      id: `${tabId}:${++dismissalSequence}`,
      action: label,
      sender: label === 'CHAT' ? toastSender(toast) : '',
      toastKey,
      ordinal: Math.max(0, ordinal),
      at: Date.now(),
      source: tabId
    };
    closingToasts.add(toast);
    if (label === 'CHAT') applyDismissal(dismissal);
    GM_setValue(DISMISS_KEY, dismissal);
    window.setTimeout(() => {
      if (toast.isConnected) toast.remove();
      tmRuntime.schedule(0);
    }, 300);
  }, true);

  GM_addValueChangeListener(DISMISS_KEY, (_key, _oldValue, dismissal, remote) => {
    if (!remote || dismissal?.source === tabId || !isRecentDismissal(dismissal)) return;
    if (dismissal.action === 'CHAT') {
      applyDismissal(dismissal);
      return;
    }
    pendingDismissals.push(dismissal);
    applyPendingDismissals();
    tmRuntime.schedule(0);
  });

  GM_addValueChangeListener(ALERT_EVENT_KEY, (_key, _oldValue, event, remote) => {
    if (!remote || !event || event.source === tabId ||
        event.account !== alertAccountId() || !Number.isFinite(event.at) ||
        Date.now() - event.at < 0 || Date.now() - event.at > 3000) return;
    publishChatAlert({ sender: '', source: 'relay', origin: event.source, key: event.key });
  });

  window.addEventListener('storage', (event) => {
    if (event.key?.startsWith(OPEN_CHAT_PREFIX)) checkMessages();
    if (event.key?.startsWith(FOCUS_PREFIX) && isAnyKlingoTabFocused()) stopBlink();
  });
  window.addEventListener('pagehide', () => {
    try { localStorage.removeItem(OPEN_CHAT_PREFIX + tabId); } catch (_) {}
    try { localStorage.removeItem(FOCUS_PREFIX + tabId); } catch (_) {}
    const account = alertAccountId();
    if (account && isOwner()) GM_setValue(`${OWNER_KEY}:${account}`, null);
  });
  window.setInterval(() => {
    syncGlobalFocus();
    syncOpenChat();
    checkMessages();
  }, 2000);

  window.addEventListener('focus', () => {
    syncGlobalFocus();
    stopBlink();
    claimOwner(true);
  });
  document.addEventListener('visibilitychange', () => {
    syncGlobalFocus();
    if (document.visibilityState === 'visible' && document.hasFocus()) {
      stopBlink();
      claimOwner(true);
    }
  });
  window.setInterval(maintainOwner, 2000);
  window.addEventListener('blur', syncGlobalFocus);
  window.addEventListener('pointerdown', armScriptAudio, { capture: true });
  window.addEventListener('keydown', armScriptAudio, { capture: true });
  syncGlobalFocus();
  syncNativeChatAudio();
  syncNativeMessageHook();
  knownToastCounts = countMessageToasts();
  detectNewToasts(messageToasts(), true);
  if (!nativeChatHooked) scanOpenChatMessages();
  if (document.hasFocus()) claimOwner(true);
  else scheduleTakeover();

  tmRuntime.register('alerta de mensagens', checkMessages);
})();

/* Sincroniza entre guias somente a quantidade que o chat nativo marcou como lida. */
(function () {
  'use strict';

  const READ_KEY = 'klingo_chat_read_event_v1';
  const READ_TTL = 30000;
  const tabId = typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  let sequence = 0;
  let nativeCount = null;
  let pendingDiscount = 0;
  let pendingLocalRead = null;
  let watchNewMessagesUntil = 0;
  let knownToastCounts = new Map();
  const newMessagesBySender = new Map();
  const recentEvents = new Map();
  const recentLocalReads = new Map();
  const recentNativeDrops = [];
  const hiddenBadges = new WeakMap();

  function normalize(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLocaleUpperCase('pt-BR');
  }

  function badgeNumber(badge) {
    const match = badge?.textContent.match(/\d+/);
    return match ? Number(match[0]) : 0;
  }

  function nativeBadge() {
    return document.querySelector('#botao-chat .badge-warning:not([data-tm-unread-mirror])');
  }

  function unreadRow(sender) {
    if (!sender) return null;
    return Array.from(document.querySelectorAll('#modalChat button.list-group-item.list-group-item-action'))
      .find((row) => {
        const badge = row.querySelector('.badge-secondary');
        return badge && normalize(row.textContent.replace(badge.textContent, '')) === sender;
      }) || null;
  }

  function toastMessages() {
    const counts = new Map();
    document.querySelectorAll('.toasted.toastnafrente').forEach((toast) => {
      if (toast.dataset.tmCovered === '1') return;
      const directText = Array.from(toast.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent).join(' ');
      const text = (directText || toast.textContent.replace(/\s*(Fechar|Chat)\s*$/gi, ''))
        .replace(/\s+/g, ' ').trim();
      const sender = normalize(text.match(/De:\s*(.*?)\s*>>/i)?.[1]);
      if (!sender) return;
      const key = `${sender}\u0000${text}`;
      const item = counts.get(key) || { count: 0, sender };
      item.count++;
      counts.set(key, item);
    });
    return counts;
  }

  function newMessageCount() {
    return Array.from(newMessagesBySender.values()).reduce((sum, count) => sum + count, 0);
  }

  function subtractNewMessages(sender, amount) {
    if (!sender || !amount) return;
    const remaining = Math.max(0, (newMessagesBySender.get(sender) || 0) - amount);
    if (remaining) newMessagesBySender.set(sender, remaining);
    else newMessagesBySender.delete(sender);
  }

  function trackNewMessages() {
    const current = toastMessages();
    if (pendingDiscount > 0 || Date.now() < watchNewMessagesUntil) {
      current.forEach((item, key) => {
        const added = item.count - (knownToastCounts.get(key)?.count || 0);
        if (added > 0) {
          newMessagesBySender.set(item.sender,
            (newMessagesBySender.get(item.sender) || 0) + added);
        }
      });
    }
    knownToastCounts = current;
  }

  function restoreBadge(badge) {
    if (!badge || !hiddenBadges.has(badge)) return;
    const original = hiddenBadges.get(badge);
    if (original.value) badge.style.setProperty('display', original.value, original.priority);
    else badge.style.removeProperty('display');
    hiddenBadges.delete(badge);
  }

  function renderCount() {
    const button = document.querySelector('#botao-chat');
    if (!button) return;
    const badge = nativeBadge();
    let mirror = button.querySelector('[data-tm-unread-mirror="1"]');
    const freshCount = newMessageCount();
    if (pendingDiscount === 0 && nativeCount >= freshCount) {
      newMessagesBySender.clear();
      mirror?.remove();
      restoreBadge(badge);
      return;
    }

    const displayed = Math.max(0, nativeCount - pendingDiscount, freshCount);
    if (displayed > 0) {
      if (!mirror) {
        mirror = badge?.cloneNode(true) || document.createElement('span');
        if (!badge) {
          mirror.className = 'badge badge-warning';
          mirror.innerHTML = '<i class="fas fa-comment-dots mr-1"></i>';
        }
        mirror.dataset.tmUnreadMirror = '1';
        mirror.style.removeProperty('display');
        if (badge) badge.insertAdjacentElement('afterend', mirror);
        else button.append(mirror);
      }
      if (mirror.dataset.tmUnreadCount !== String(displayed)) {
        const icon = (badge || mirror).querySelector('i')?.cloneNode(true);
        mirror.replaceChildren(...(icon ? [icon] : []), document.createTextNode(` ${displayed}`));
        mirror.dataset.tmUnreadCount = String(displayed);
      }
    } else {
      mirror?.remove();
    }

    if (badge && !hiddenBadges.has(badge)) {
      hiddenBadges.set(badge, {
        value: badge.style.getPropertyValue('display'),
        priority: badge.style.getPropertyPriority('display')
      });
      badge.style.setProperty('display', 'none', 'important');
    }
  }

  function pruneEvents() {
    const now = Date.now();
    recentEvents.forEach((at, id) => {
      if (now - at > READ_TTL) recentEvents.delete(id);
    });
    recentLocalReads.forEach((read, sender) => {
      if (now - read.at > 3000) recentLocalReads.delete(sender);
    });
    for (let index = recentNativeDrops.length - 1; index >= 0; index--) {
      if (now - recentNativeDrops[index].at > 3000) recentNativeDrops.splice(index, 1);
    }
  }

  function consumeNativeDrop(amount, eventAt) {
    for (const drop of recentNativeDrops) {
      if (!amount) break;
      if (Math.abs(drop.at - eventAt) > 3000) continue;
      const consumed = Math.min(amount, drop.remaining);
      drop.remaining -= consumed;
      amount -= consumed;
    }
    return amount;
  }

  function broadcastRead(delta, before, after, sender) {
    if (delta <= 0) return;
    const event = {
      id: `${tabId}:${++sequence}`,
      source: tabId,
      sender,
      delta,
      before,
      after,
      at: Date.now()
    };
    recentEvents.set(event.id, event.at);
    if (sender) {
      const previous = recentLocalReads.get(sender);
      recentLocalReads.set(sender, {
        delta: delta + (previous && event.at - previous.at < 3000 ? previous.delta : 0),
        at: event.at
      });
    }
    GM_setValue(READ_KEY, event);
  }

  function updateCount() {
    const current = badgeNumber(nativeBadge());
    if (nativeCount === null) {
      nativeCount = current;
      renderCount();
      return;
    }

    if (current < nativeCount) {
      let decrease = nativeCount - current;
      if (pendingLocalRead && Date.now() < pendingLocalRead.expiresAt) {
        const localDecrease = Math.min(decrease, pendingLocalRead.remaining);
        if (localDecrease > 0) {
          broadcastRead(localDecrease, nativeCount, current, pendingLocalRead.sender);
          subtractNewMessages(pendingLocalRead.sender, localDecrease);
          pendingLocalRead.remaining -= localDecrease;
          decrease -= localDecrease;
          if (pendingLocalRead.remaining === 0) pendingLocalRead = null;
        }
      }
      // O próprio Klingo pode atualizar a outra guia depois; nesse caso, retire
      // o desconto correspondente para não subtrair as mensagens duas vezes.
      const reconciled = Math.min(pendingDiscount, decrease);
      pendingDiscount -= reconciled;
      if (decrease > reconciled) {
        recentNativeDrops.push({ remaining: decrease - reconciled, at: Date.now() });
      }
    }
    nativeCount = current;
    renderCount();
  }

  function recordCoveredMessage(event) {
    const sender = normalize(event.detail?.sender);
    if (!sender) return;
    pendingDiscount += 1;
    subtractNewMessages(sender, 1);
    updateCount();
  }

  document.addEventListener('tm-chat-covered-message', recordCoveredMessage);

  document.addEventListener('click', (event) => {
    if (!event.isTrusted) return;
    const target = event.target?.nodeType === Node.ELEMENT_NODE
      ? event.target : event.target?.parentElement;
    if (!target) return;

    let sender = '';
    let expected = Infinity;
    const row = target.closest('#modalChat button.list-group-item.list-group-item-action');
    if (row) {
      const badge = row.querySelector('.badge-secondary');
      expected = badgeNumber(badge);
      sender = normalize(row.textContent.replace(badge?.textContent || '', ''));
      if (!expected) return;
    } else {
      const toast = target.closest('.toasted.toastnafrente');
      const action = target.closest('a.action');
      if (!toast || !action || !toast.contains(action) || normalize(action.textContent) !== 'CHAT') return;
      sender = normalize(toast.textContent.match(/De:\s*(.*?)\s*>>/i)?.[1]);
      const matchingRow = unreadRow(sender);
      if (matchingRow) expected = badgeNumber(matchingRow.querySelector('.badge-secondary'));
    }

    updateCount();
    if (!nativeCount) return;
    pendingLocalRead = { sender, remaining: expected, expiresAt: Date.now() + 8000 };
    window.setTimeout(updateCount, 50);
    window.setTimeout(updateCount, 300);
    window.setTimeout(updateCount, 1200);
  }, true);

  GM_addValueChangeListener(READ_KEY, (_key, _oldValue, event, remote) => {
    if (!remote || !event || event.source === tabId ||
        !Number.isFinite(event.at) || Date.now() - event.at < 0 ||
        Date.now() - event.at > READ_TTL || !Number.isFinite(event.delta) || event.delta <= 0) return;
    pruneEvents();
    if (recentEvents.has(event.id)) return;
    recentEvents.set(event.id, event.at);
    updateCount();

    const ownRead = recentLocalReads.get(event.sender);
    if (ownRead && ownRead.delta >= event.delta && Math.abs(ownRead.at - event.at) < 3000) return;

    let decrease = consumeNativeDrop(event.delta, event.at);
    const row = unreadRow(event.sender);
    if (row) decrease = Math.min(decrease, badgeNumber(row.querySelector('.badge-secondary')));
    pendingDiscount = Math.min(nativeCount, pendingDiscount + decrease);
    subtractNewMessages(event.sender, event.delta);
    watchNewMessagesUntil = Date.now() + 120000;
    knownToastCounts = toastMessages();
    if (pendingLocalRead?.sender && pendingLocalRead.sender === event.sender) pendingLocalRead = null;
    renderCount();
  });

  const observer = new MutationObserver((mutations) => {
    const changedToasts = mutations.some((mutation) => {
      const target = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target : mutation.target.parentElement;
      if (target?.closest?.('.toasted.toastnafrente')) return true;
      return Array.from(mutation.addedNodes || []).some((node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches?.('.toasted.toastnafrente') || node.querySelector?.('.toasted.toastnafrente')));
    });
    const changedChatButton = mutations.some((mutation) => {
      const target = mutation.target.nodeType === Node.ELEMENT_NODE
        ? mutation.target : mutation.target.parentElement;
      if (target?.closest?.('#botao-chat')) return true;
      return Array.from(mutation.addedNodes || []).some((node) =>
        node.nodeType === Node.ELEMENT_NODE &&
        (node.matches?.('#botao-chat') || node.querySelector?.('#botao-chat')));
    });
    if (changedToasts) trackNewMessages();
    if (changedChatButton) updateCount();
    else if (changedToasts) renderCount();
  });
  observer.observe(document.body, {
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['class'],
    subtree: true
  });
  knownToastCounts = toastMessages();
  tmRuntime.register('contador de chat entre guias', updateCount);
})();



})();

/* =========================
   MODAL HORÁRIOS - COPIAR COM BOTÃO DIREITO
   v18.4 - header temporário mascarando só a linha nativa
========================= */
(function () {
  'use strict';

  const OPENING = {
    date: '',
    weekday: '',
    hour: '',
    timestamp: 0
  };

  let lastModalOpen = false;

  function injectStyle() {
    if (document.getElementById('tm-slot-copy-style-18-4')) return;

    const style = document.createElement('style');
    style.id = 'tm-slot-copy-style-18-4';
    style.textContent = `
      #minutoModal .modal-title.tm-slot-title-masked {
        font-size: 0 !important;
        line-height: 0 !important;
      }

      #minutoModal .modal-title.tm-slot-title-masked > .tm-slot-copy-temp-header {
        display: block !important;
        color: #333333 !important;
        font-family: "Segoe UI", Arial, sans-serif !important;
        font-size: 18.75px !important;
        line-height: 1.45 !important;
        font-weight: 500 !important;
        margin: 0 0 4px 0 !important;
      }

      #minutoModal .modal-title.tm-slot-title-masked > .small.text-muted {
        display: block !important;
        font-size: 15px !important;
        line-height: 1.4 !important;
        font-weight: 400 !important;
        margin-top: 2px !important;
      }

      #minutoModal .tm-slot-copy-success-icon {
        position: absolute !important;
        right: 18px !important;
        bottom: 18px !important;
        z-index: 100000001 !important;
        display: block !important;
        width: 34px !important;
        height: 34px !important;
        color: #28a745 !important;
        font-size: 34px !important;
        line-height: 1 !important;
        margin: 0 !important;
        padding: 0 !important;
        pointer-events: none !important;
        user-select: none !important;
        opacity: 1 !important;
        transition: opacity 300ms ease !important;
      }

      #minutoModal .tm-slot-copy-success-icon.tm-slot-copy-success-fade {
        opacity: 0 !important;
      }
    `;

    document.head.appendChild(style);
  }

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function titleCase(value) {
    const lower = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);

    return norm(value)
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((part, index) => {
        if (index > 0 && lower.has(part)) return part;
        return part.charAt(0).toUpperCase() + part.slice(1);
      })
      .join(' ');
  }

  function displayDateFromShort(value) {
    const match = norm(value).match(/^(\d{1,2})\/(\d{2})$/);
    const months = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
      '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
      '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };

    if (!match) return '';

    return `${Number(match[1])} de ${months[match[2]] || match[2]}`;
  }

  function formatHourFromList(value) {
    const text = norm(value);

    let match = text.match(/^(\d{1,2})h$/i);
    if (match) return `${Number(match[1])}h`;

    match = text.match(/^(\d{1,2}):(\d{2})\s*-\s*\d{1,2}:\d{2}$/);
    if (match) return `${Number(match[1])}h${match[2]}`;

    match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (match) return `${Number(match[1])}h${match[2]}`;

    return '';
  }

  function formatTimeFromModal(value) {
    const text = norm(value);

    let match = text.match(/^(\d{1,2}):(\d{2})$/);
    if (match) return `${Number(match[1])}h${match[2]}`;

    match = text.match(/^(\d{1,2}):(\d{2})\s*-\s*\d{1,2}:\d{2}$/);
    if (match) return `${Number(match[1])}h${match[2]}`;

    return '';
  }

  function getModal() {
    const modal = document.querySelector('#minutoModal');
    if (!modal) return null;

    const style = getComputedStyle(modal);
    const rect = modal.getBoundingClientRect();

    if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return modal;
  }

  function getTitle(modal) {
    return modal?.querySelector?.('.modal-header .modal-title') || null;
  }

  function readConsultaText(titleEl) {
    return norm(titleEl?.querySelector?.('.small.text-muted')?.innerText || '');
  }

  function resetOpening() {
    OPENING.date = '';
    OPENING.weekday = '';
    OPENING.hour = '';
    OPENING.timestamp = 0;
  }

  function clearTemporaryHeader(modal = document.querySelector('#minutoModal')) {
    if (!modal) return;

    modal.querySelectorAll('.tm-slot-copy-temp-header').forEach((el) => el.remove());
    modal.querySelectorAll('.tm-slot-copy-success-icon').forEach((el) => el.remove());

    const titleEl = getTitle(modal);
    if (titleEl) {
      titleEl.classList.remove('tm-slot-title-masked');
    }
  }

  function captureOpeningFromListButton(button) {
    const li = button.closest('li.list-group-item');
    if (!li) return;

    const rawDate = norm(li.querySelector('h4 .card-link, h4 a, h4')?.innerText || '');
    const rawWeekday = norm(li.querySelector('small.text-muted')?.innerText || '');
    const rawHour = norm(button.innerText || button.textContent || '');

    const date = displayDateFromShort(rawDate);
    const hour = formatHourFromList(rawHour);

    if (!date || !rawWeekday || !hour) return;

    OPENING.date = date;
    OPENING.weekday = rawWeekday;
    OPENING.hour = hour;
    OPENING.timestamp = Date.now();
  }

  function headerDataFromOpeningOrNative(modal) {
    const titleEl = getTitle(modal);
    if (!titleEl) return null;

    const consultaText = readConsultaText(titleEl);

    if (OPENING.date && OPENING.weekday && OPENING.hour && Date.now() - OPENING.timestamp < 30000) {
      return {
        titleEl,
        date: OPENING.date,
        weekday: OPENING.weekday,
        hour: OPENING.hour,
        consultaText
      };
    }

    const clone = titleEl.cloneNode(true);
    clone.querySelectorAll('.small.text-muted').forEach((el) => el.remove());
    clone.querySelectorAll('.tm-slot-copy-temp-header').forEach((el) => el.remove());

    const main = norm(clone.innerText || clone.textContent || '');
    const match = main.match(/(\d{1,2}\s+de\s+[A-Za-zÀ-ÿ]+)\s*\|\s*([^|]+)\s*\|\s*(\d{1,2}h(?:\d{2})?)/i);

    if (!match) return null;

    return {
      titleEl,
      date: norm(match[1]),
      weekday: norm(match[2]),
      hour: norm(match[3]),
      consultaText
    };
  }

  function getDoctorRow(button) {
    return button.closest('.row');
  }

  function getDoctorName(row) {
    if (!row) return '';

    const nameEl = row.querySelector('.col.col-12.col-md-6 > div:first-child');
    const crmEl = Array.from(row.querySelectorAll('.col.col-12.col-md-6 > div')).find((el) => {
      return /\bCRM\b/i.test(norm(el.innerText || el.textContent || ''));
    });

    if (!nameEl || !crmEl) return '';

    return titleCase(nameEl.innerText || nameEl.textContent || '');
  }

  function getUnitName(row) {
    if (!row) return '';

    const raw = norm(row.querySelector('.col.col-12.col-md-4')?.innerText || '');
    const match = raw.match(/\(([^)]+)\)/);

    if (!match) return '';

    return titleCase(match[1]);
  }

  function shouldUseDoctor(data, row) {
    return (
      /\bCONSULTA\b/i.test(data.consultaText || '') &&
      /\bCRM\b/i.test(norm(row?.innerText || row?.textContent || ''))
    );
  }

  function cleanProcedureText(value) {
    return norm(value)
      .replace(/\s*\(\s*\d+\s*\)\s*/g, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function buildDisplayLines(data, clickedTime, doctorName, unitName) {
    const line = `${data.date} | ${data.weekday} | ${clickedTime}`;

    if (doctorName) {
      return [
        `👨‍⚕️ Médico(a): ${doctorName}`,
        `📅 Data: ${line}`,
        unitName ? `📍Unidade: ${unitName}` : ''
      ].filter(Boolean);
    }

    const procedure = cleanProcedureText(data.consultaText || '');

    if (procedure) {
      return [
        `🔬 Exame: ${procedure}`,
        `🗓️ Data: ${line}`,
        unitName ? `📍Unidade: ${unitName}` : ''
      ].filter(Boolean);
    }

    return [line];
  }

  function applyTemporaryHeader(modal, data, clickedTime, doctorName, unitName) {
    const titleEl = data.titleEl;
    if (!titleEl) return;

    injectStyle();
    clearTemporaryHeader(modal);

    const temp = document.createElement('div');
    temp.className = 'tm-slot-copy-temp-header';
    buildDisplayLines(data, clickedTime, doctorName, unitName).forEach((line) => {
      const lineElement = document.createElement('div');
      lineElement.textContent = line;
      temp.appendChild(lineElement);
    });

    // Máscara:
    // - não remove o texto original
    // - não substitui a estrutura nativa
    // - esconde visualmente apenas a linha original por font-size: 0 no título
    // - reexibe o procedimento .small.text-muted via CSS
    titleEl.insertBefore(temp, titleEl.firstChild);
    titleEl.classList.add('tm-slot-title-masked');
  }

  function buildCopyText(data, clickedTime, doctorName, unitName) {
    return buildDisplayLines(data, clickedTime, doctorName, unitName).join('\n');
  }

  function clearCopySuccessIcons(modal = document.querySelector('#minutoModal')) {
    if (!modal) return;
    modal.querySelectorAll('.tm-slot-copy-success-icon').forEach((el) => el.remove());
  }

  function showCopySuccessIcon(button) {
    if (!(button instanceof Element)) return;

    const modal = button.closest('#minutoModal');
    if (!modal) return;

    clearCopySuccessIcons(modal);

    const content = modal.querySelector('.modal-content') || modal;
    const contentStyle = getComputedStyle(content);

    if (contentStyle.position === 'static') {
      content.style.position = 'relative';
    }

    const icon = document.createElement('span');
    icon.className = 'tm-slot-copy-success-icon';
    icon.textContent = '✓';
    icon.setAttribute('role', 'img');
    icon.setAttribute('aria-label', 'Copiado');

    content.appendChild(icon);

    window.setTimeout(() => {
      icon.classList.add('tm-slot-copy-success-fade');
    }, 1000);

    window.setTimeout(() => {
      icon.remove();
    }, 1350);
  }

  async function copyText(value) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = value;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      ta.style.top = '-9999px';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        return document.execCommand('copy');
      } finally {
        ta.remove();
      }
    }
  }

  document.addEventListener('mousedown', (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('li.list-group-item button.btn')
      : null;

    if (!button || button.closest('#minutoModal')) return;

    clearTemporaryHeader();
  }, true);

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('li.list-group-item button.btn')
      : null;

    if (button && !button.closest('#minutoModal')) {
      clearTemporaryHeader();

      const before = OPENING.timestamp;
      captureOpeningFromListButton(button);

      if (OPENING.timestamp === before) {
        resetOpening();
      }

      return;
    }

    const close = event.target instanceof Element
      ? event.target.closest('#minutoModal [data-dismiss="modal"], #minutoModal .close')
      : null;

    if (close) {
      const modal = close.closest('#minutoModal');
      clearTemporaryHeader(modal);
      resetOpening();
    }
  }, true);

  document.addEventListener('contextmenu', async (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('#minutoModal button.btn.btn-sm')
      : null;

    if (!button) return;

    const modal = getModal();
    if (!modal || !modal.contains(button)) return;

    const clickedTime = formatTimeFromModal(button.innerText || button.textContent || '');
    const data = headerDataFromOpeningOrNative(modal);

    if (!clickedTime || !data) return;

    event.preventDefault();
    event.stopPropagation();

    const row = getDoctorRow(button);
    const doctorName = shouldUseDoctor(data, row) ? getDoctorName(row) : '';
    const unitName = getUnitName(row);

    applyTemporaryHeader(modal, data, clickedTime, doctorName, unitName);
    const copied = await copyText(buildCopyText(data, clickedTime, doctorName, unitName)).catch(() => false);
    if (copied) {
      showCopySuccessIcon(button);
    } else {
      clearTemporaryHeader(modal);
    }
  }, true);

  tmRuntime.register('modal de horários', () => {
    const modal = document.querySelector('#minutoModal');
    const isOpen = !!getModal();

    if (!isOpen && lastModalOpen) {
      clearTemporaryHeader(modal);
      resetOpening();
    }

    lastModalOpen = isOpen;
  }, ['#/call-center']);
})();

/* =========================
   MODAL AGENDAMENTO - PRIMEIRA VEZ
   v19.4 - reorganização visual sem mover DOM
========================= */
const tmBookingModalWatch = (() => {
  const listeners = new Set();
  let modal = null;
  const modalObserver = new MutationObserver(() => {
    listeners.forEach((listener) => listener(modal));
  });
  function discover() {
    const current = document.getElementById('cadastroModal');
    if (current === modal) return;
    modalObserver.disconnect();
    modal = current;
    if (modal) modalObserver.observe(modal, {
      attributes: true, attributeFilter: ['class', 'style'], childList: true, subtree: true
    });
    listeners.forEach((listener) => listener(modal));
  }
  new MutationObserver(discover).observe(document.documentElement, { childList: true, subtree: true });
  return { subscribe(listener) {
    listeners.add(listener);
    const previous = modal;
    discover();
    if (modal === previous) listener(modal);
  } };
})();
(function () {
  'use strict';

  const TM_CADASTRO_LAYOUT_ID = 'tm-cadastro-primeira-vez-layout-22-4';
  const modalBaselines = new WeakMap();
  const cpfLookups = new WeakMap();
  const otherCpfObservers = new WeakMap();
  const pendingCpfTransfers = new WeakMap();

  function tmCadNorm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function tmCadInjectStyle() {
    if (document.getElementById(TM_CADASTRO_LAYOUT_ID)) return;

    const style = document.createElement('style');
    style.id = TM_CADASTRO_LAYOUT_ID;
    style.textContent = `
      #cadastroModal.tm-primeira-vez-layout {
        text-align: center !important;
      }

      #cadastroModal.tm-primeira-vez-layout .modal-dialog {
        width: 800px !important;
        max-width: calc(100vw - 24px) !important;
        margin-left: auto !important;
        margin-right: auto !important;
        text-align: left !important;
      }

      #cadastroModal.tm-primeira-vez-layout .modal-content {
        width: 800px !important;
        max-width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp {
        display: grid !important;
        grid-template-columns: 200px minmax(0, 1fr) 200px 200px !important;
        column-gap: 10px !important;
        row-gap: 4px !important;
        align-items: start !important;
        width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp > .border-bottom {
        grid-column: 1 / -1 !important;
        grid-row: 1 !important;
        width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp > .form-row {
        display: contents !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp > .tm-cad-origem-inline-row {
        display: contents !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-col,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-col-4,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-col-6,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-col-12 {
        flex: initial !important;
        max-width: none !important;
        width: auto !important;
        min-width: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group > .form-control,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group > input.form-control,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group > select.form-control {
        flex: 1 1 auto !important;
        width: auto !important;
        min-width: 0 !important;
        max-width: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group > .input-group-prepend,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group > .input-group-append {
        display: flex !important;
        flex: 0 0 auto !important;
        width: auto !important;
        max-width: none !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group > .input-group-text,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group > .btn,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group-prepend > .input-group-text,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group-append > .input-group-text,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group-prepend > .btn,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .input-group-append > .btn {
        flex: 0 0 auto !important;
        width: auto !important;
        max-width: none !important;
        white-space: nowrap !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-nascimento .input-group,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-celular .input-group {
        width: 200px !important;
        max-width: 200px !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-celular .input-group-prepend,
      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-celular .tm-cad-phone-country-hidden {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-nome {
        grid-column: 1 / 3 !important;
        grid-row: 2 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-nascimento {
        grid-column: 3 !important;
        grid-row: 2 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-cpf {
        grid-column: 4 !important;
        grid-row: 2 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-celular {
        grid-column: 1 !important;
        grid-row: 3 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-origem {
        grid-column: 2 / 4 !important;
        grid-row: 3 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-sexo {
        grid-column: 4 !important;
        grid-row: 3 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-carteira {
        grid-column: 1 / 3 !important;
        grid-row: 4 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-order-validade {
        grid-column: 3 !important;
        grid-row: 4 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-col {
        padding-left: 5px !important;
        padding-right: 5px !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-col-4 {
        flex: 0 0 33.333333% !important;
        max-width: 33.333333% !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-col-6 {
        flex: 0 0 50% !important;
        max-width: 50% !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-hidden-field {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-nome { order: 10 !important; }
      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-nascimento { order: 20 !important; }
      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-cpf { order: 30 !important; }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-celular { order: 40 !important; }
      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-email { order: 50 !important; }
      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-sexo { order: 60 !important; }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-carteira { order: 70 !important; }
      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-validade { order: 80 !important; }
      #cadastroModal.tm-primeira-vez-layout .tm-cad-order-origem { order: 50 !important; }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-origem-col,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-origem-col .form-group,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-origem-col .input-group,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-origem-col select {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-select-row {
        margin-top: 4px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-col {
        flex: 0 0 100% !important;
        max-width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp > .form-row.tm-cad-observacao-row,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-row {
        display: flex !important;
        flex-wrap: wrap !important;
        width: 100% !important;
        flex: 0 0 100% !important;
        max-width: 100% !important;
        order: 100 !important;
      }

      #cadastroModal.tm-primeira-vez-layout #cadTemp > .form-row.tm-cad-observacao-row > .tm-cad-observacao-col,
      #cadastroModal.tm-primeira-vez-layout #cadTemp > .form-row.tm-cad-observacao-row > .tm-cad-observacao-aux-col,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-row > .tm-cad-observacao-col,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-row > .tm-cad-observacao-aux-col {
        display: block !important;
        flex: 0 0 100% !important;
        max-width: 100% !important;
        width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-aux-col {
        flex: 0 0 min(353.78px, 100%) !important;
        max-width: min(353.78px, 100%) !important;
        width: min(353.78px, 100%) !important;
        padding-left: 5px !important;
        padding-right: 5px !important;
        margin-top: 4px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-aux-col {
        width: min(353.78px, 100%) !important;
        max-width: min(353.78px, 100%) !important;
        flex: 0 0 min(353.78px, 100%) !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-aux-col .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        width: min(353.78px, 100%) !important;
        max-width: min(353.78px, 100%) !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-aux-col .input-group-prepend {
        display: flex !important;
        flex: 0 0 auto !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-aux-col select {
        width: auto !important;
        max-width: none !important;
        flex: 1 1 auto !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-select-row > .input-group {
        width: 100% !important;
        max-width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-row > .tm-cad-observacao-col .input-group,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-row > .tm-cad-observacao-col input.form-control {
        width: 100% !important;
        max-width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-original-input-hidden {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-row > .tm-cad-observacao-col {
        padding-left: 5px !important;
        padding-right: 5px !important;
        box-sizing: border-box !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-row > .tm-cad-observacao-col .input-group {
        width: calc(100% + 10px) !important;
        max-width: calc(100% + 10px) !important;
        box-sizing: border-box !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-observacao-textarea {
        display: block !important;
        width: calc(100% + 10px) !important;
        max-width: calc(100% + 10px) !important;
        height: 95px !important;
        min-height: 95px !important;
        resize: vertical !important;
        overflow-y: auto !important;
        white-space: pre-wrap !important;
        overflow-wrap: break-word !important;
        word-break: break-word !important;
        line-height: 1.35 !important;
        padding-top: 6px !important;
        padding-bottom: 6px !important;
        box-sizing: border-box !important;
        font: inherit !important;
      }

      #cadastroModal.tm-primeira-vez-layout div.mt-3.mb-5 {
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        flex-grow: 0 !important;
        padding-bottom: 0 !important;
        margin-bottom: 16px !important;
      }

      #cadastroModal.tm-primeira-vez-layout div.mt-3.mb-5 > br {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card * {
        font-family: inherit !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        font-style: normal !important;
        line-height: 1.4 !important;
        letter-spacing: normal !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card {
        position: relative !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-title {
        margin-bottom: 6px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-procedure-emoji {
        margin-right: 5px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-ocupar {
        position: absolute !important;
        right: 12px !important;
        bottom: 10px !important;
        z-index: 2;
        margin: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-info-wrap {
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        justify-content: flex-start !important;
        gap: 4px !important;
        width: 100% !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-left {
        display: contents !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-row {
        display: block !important;
        width: 100% !important;
        margin-right: 0 !important;
        margin-bottom: 0 !important;
        white-space: normal !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-profissional {
        order: 2 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-convenio {
        order: 3 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-unidade {
        order: 4 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-data {
        order: 5 !important;
        display: block !important;
        width: 100% !important;
        margin-top: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-date-line,
      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-time-line {
        display: block !important;
        width: 100% !important;
        margin-left: 0 !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-time-line {
        margin-top: 2px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-native-icon-hidden {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-emoji {
        display: inline-block !important;
        width: 1.5em !important;
        margin-right: 4px !important;
        vertical-align: baseline !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card .tm-cad-header-sala {
        font-size: 13px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-card blockquote {
        margin-top: 6px !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-convenio-externo-oculto {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-header-convenio-injetado {
        display: block !important;
      }





      #cadastroModal.tm-primeira-vez-layout .tm-cad-origem-section-hidden {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-origem-title-hidden {
        display: none !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-warning-host {
        position: relative !important;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-required-warning {
        position: absolute !important;
        z-index: 3;
        display: none;
        align-items: center;
        justify-content: center;
        width: 24px;
        color: #dc3545;
        background: #f8d7da;
        border-right: 1px solid #f5c6cb;
        border-radius: 3px 0 0 3px;
        font-weight: 700;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-required-warning.tm-cad-warning-visible {
        display: inline-flex;
      }

      #cadastroModal.tm-primeira-vez-layout .tm-cad-warning-control {
        padding-left: 30px !important;
      }

      @media (max-width: 720px) {
        #cadastroModal.tm-primeira-vez-layout #cadTemp {
          grid-template-columns: minmax(0, 1fr) !important;
        }
        #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-col,
        #cadastroModal.tm-primeira-vez-layout #cadTemp .tm-cad-observacao-row {
          grid-column: 1 / -1 !important;
          grid-row: auto !important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function tmCadVisibleModal() {
    const modal = document.querySelector('#cadastroModal');
    if (!modal) return null;

    const style = getComputedStyle(modal);
    const rect = modal.getBoundingClientRect();

    if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) {
      return null;
    }

    return modal;
  }

  function tmCadFieldByLabel(modal, labelText) {
    const labels = Array.from(modal.querySelectorAll('small.form-text.text-muted'));
    const allowedLabels = String(labelText || '')
      .split('|')
      .map((item) => tmCadNorm(item))
      .filter(Boolean);

    for (const label of labels) {
      const currentLabel = tmCadNorm(label.innerText || label.textContent || '');
      if (!allowedLabels.includes(currentLabel)) continue;

      const col = label.closest('.col');
      if (col && modal.contains(col)) return col;
    }

    return null;
  }

  function tmCadHasLabel(modal, labelText) {
    return !!tmCadFieldByLabel(modal, labelText);
  }

  function tmCadIsValidCpf(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

    for (let length = 9; length <= 10; length += 1) {
      let sum = 0;
      for (let index = 0; index < length; index += 1) {
        sum += Number(digits[index]) * (length + 1 - index);
      }
      const remainder = (sum * 10) % 11;
      if (Number(digits[length]) !== (remainder === 10 ? 0 : remainder)) return false;
    }
    return true;
  }

  function tmCadPhoneInvalid(input) {
    const digits = String(input?.value || '').replace(/\D/g, '');
    if (!digits || input?.validity?.valid === false) return true;
    return digits.length < 10 || digits.length > 11;
  }

  function tmCadRequiredProblems(modal) {
    const labels = [
      ['nome', 'Nome', 'input'],
      ['nascimento', 'Data de Nascimento', 'input[type="date"]'],
      ['cpf', 'CPF', 'input'],
      ['celular', 'Celular', 'input[type="tel"], input:not([type="hidden"])'],
      ['origem', 'Origem de Pacientes|Origem do Agendamento', 'select'],
      ['sexo', 'Sexo', 'select']
    ];
    const fields = labels.map(([key, label, selector]) => {
      const field = tmCadFieldByLabel(modal, label);
      const control = field?.querySelector(selector) || null;
      const value = tmCadNorm(control?.value);
      const selectedText = tmCadNorm(control?.selectedOptions?.[0]?.textContent);
      const missing = !control || !value || (control.tagName === 'SELECT' && /^Selecione/i.test(selectedText));
      const malformed = !missing && (key === 'cpf' ? !tmCadIsValidCpf(value) :
        key === 'celular' ? tmCadPhoneInvalid(control) : control.validity?.valid === false);
      return { key, field, control, missing, malformed };
    });
    return fields;
  }

  function tmCadSetRequiredWarning(field, input, invalid) {
    if (!field || !input) return;
    const host = input.parentElement;
    if (!host) return;
    host.classList.add('tm-cad-warning-host');
    let warning = host.querySelector(':scope > .tm-cad-required-warning');
    if (!warning) {
      warning = document.createElement('span');
      warning.className = 'tm-cad-required-warning';
      warning.textContent = '!';
      warning.setAttribute('aria-hidden', 'true');
      host.appendChild(warning);
    }
    warning.style.top = `${input.offsetTop + 1}px`;
    warning.style.left = `${input.offsetLeft + 1}px`;
    warning.style.height = `${Math.max(0, input.offsetHeight - 2)}px`;
    warning.classList.toggle('tm-cad-warning-visible', invalid);
    input.classList.toggle('tm-cad-warning-control', invalid);
  }

  function tmCadRefreshRequiredWarnings(modal, force = false) {
    if (!modal || !tmCadIsPrimeiraVez(modal)) return;
    for (const { field, control, missing, malformed } of tmCadRequiredProblems(modal)) {
      tmCadSetRequiredWarning(field, control,
        !!control && force && (missing || malformed));
    }
  }

  function tmCadBookingComponent(modal) {
    const firstVisit = document.querySelector('input[placeholder="Operadora/Plano..."]') ||
      Array.from(document.querySelectorAll('a')).find((link) => tmCadNorm(link.textContent) === 'Primeira Vez');
    for (const start of [modal, firstVisit]) {
      for (let element = start; element; element = element.parentElement) {
        const vue = element.__vue__;
        if (vue?.$route?.path === '/call-center' && typeof vue.$toast?.add === 'function') return vue;
      }
    }
    return null;
  }

  function tmCadCadastroComponent(modal) {
    const component = modal?.querySelector('#cadTemp')?.parentElement?.__vue__;
    return component?.value && typeof component.$util?.loadItem === 'function' &&
      typeof component.identificar_paciente === 'function' ? component : null;
  }

  function tmCadIsCpfLookupTarget(modal) {
    return tmCadIsPrimeiraVez(modal) ||
      (['novoAtendimento2Modal', 'editarMarcacaoModal'].includes(modal?.id) &&
        !!modal.querySelector('#cadTemp'));
  }

  function tmCadCpfDigits(value) {
    return String(value || '').replace(/\D/g, '');
  }

  function tmCadExactCpfRecords(records, cpf) {
    return Array.isArray(records) ? records.filter((record) =>
      tmCadCpfDigits(record?.st_cpf || record?.cadastro?.st_cpf || record?.pessoa?.st_cpf) === cpf &&
      Number(record?.id_pessoa) > 0) : [];
  }

  function tmCadSelectExactCpf(modal, component, cpf, records) {
    if (!modal?.isConnected || !tmCadIsCpfLookupTarget(modal) ||
        tmCadCpfDigits(tmCadFieldByLabel(modal, 'CPF')?.querySelector('input')?.value) !== cpf) return false;
    const matches = tmCadExactCpfRecords(records, cpf);
    if (matches.length !== 1) return false;
    const state = cpfLookups.get(component);
    if (state?.selectedCpf === cpf) return true;
    if (state) state.selectedCpf = cpf;
    if (modal.id === 'cadastroModal') {
      const cellular = tmCadFieldByLabel(modal, 'Celular')?.querySelector('input')?.value;
      if (cellular) pendingCpfTransfers.set(modal, { cellular, restoredInput: null });
    }
    component.identificar_paciente(matches[0]);
    return true;
  }

  function tmCadRestorePendingFields(modal) {
    const pending = pendingCpfTransfers.get(modal);
    if (!pending || tmCadIsPrimeiraVez(modal)) return;
    if (!tmCadHasLabel(modal, 'Nome do Paciente') &&
        !modal.classList.contains('tm-paciente-layout')) return;
    const cellular = tmCadFieldByLabel(modal, 'Celular')?.querySelector('input');
    if (!cellular) return;
    if (cellular !== pending.restoredInput) {
      if (!cellular.value) tmCadSetInputValue(cellular, pending.cellular);
      pending.restoredInput = cellular;
    }
  }

  function tmCadSchedulePendingRestore(modal) {
    const pending = pendingCpfTransfers.get(modal);
    if (!pending || pending.restoreScheduled) return;
    pending.restoreScheduled = true;
    tmCadRestorePendingFields(modal);
    for (const delay of [80, 250, 600]) {
      window.setTimeout(() => {
        if (pendingCpfTransfers.get(modal) === pending && modal.isConnected) {
          tmCadRestorePendingFields(modal);
        }
      }, delay);
    }
    window.setTimeout(() => {
      if (pendingCpfTransfers.get(modal) === pending) pendingCpfTransfers.delete(modal);
    }, 700);
  }

  function tmCadLookupCpf(modal) {
    if (!tmCadIsCpfLookupTarget(modal)) return null;
    const input = tmCadFieldByLabel(modal, 'CPF')?.querySelector('input');
    const cpf = tmCadCpfDigits(input?.value);
    if (!tmCadIsValidCpf(cpf)) return null;
    const component = tmCadCadastroComponent(modal);
    if (!component) return null;

    let state = cpfLookups.get(component);
    if (!state) {
      state = { cpf: '', pending: false, done: false, selectedCpf: '', matches: 0, generation: 0 };
      cpfLookups.set(component, state);
    }
    if (state.cpf !== cpf) {
      state.cpf = cpf;
      state.pending = false;
      state.done = false;
      state.selectedCpf = '';
      state.matches = 0;
      state.generation += 1;
    }
    if (tmCadSelectExactCpf(modal, component, cpf, component.lista)) return state;
    if (state.pending || state.done || state.selectedCpf === cpf) return state;

    state.pending = true;
    const generation = state.generation;
    // A pesquisa nativa de pacientes aceita CPF isolado; checar_existencia
    // exige os demais dados e falha quando recebe apenas o CPF.
    Promise.resolve(component.$util.loadItem(component, {
      service: 'pacientes', func: 'index', parms: { search: cpf }
    })).then((result) => {
      if (state.generation !== generation || !modal.isConnected || !tmCadIsCpfLookupTarget(modal) ||
          tmCadCpfDigits(input.value) !== cpf) return;
      const matches = tmCadExactCpfRecords(result, cpf);
      state.done = true;
      state.matches = matches.length;
      tmCadSelectExactCpf(modal, component, cpf, matches);
    }).catch(() => {
      if (state.generation === generation) state.done = false;
    }).finally(() => {
      if (state.generation === generation) state.pending = false;
    });
    return state;
  }

  function tmCadGuardCpfLookup(modal, event) {
    // A ficha já vinculada na Recepção não possui consulta de CPF pendente.
    // Não intercepte o Concluir: a validação própria da Recepção precisa rodar.
    if (!tmCadIsCpfLookupTarget(modal)) return true;
    const input = tmCadFieldByLabel(modal, 'CPF')?.querySelector('input');
    if (input?.readOnly) return true;
    if (!tmCadIsValidCpf(input?.value)) return true;
    const state = tmCadLookupCpf(modal);
    if (state?.done && state.matches === 0 && !state.selectedCpf) return true;
    event?.preventDefault();
    event?.stopImmediatePropagation();
    (tmCadCadastroComponent(modal)?.$toast || tmCadBookingComponent(modal)?.$toast)?.add({
      severity: 'warn', summary: 'Atenção',
      detail: state?.matches > 1 ? 'Há mais de uma ficha com este CPF. Confira os demais dados e selecione a correta.' :
        state?.selectedCpf ? 'Aguarde a ficha existente carregar.' :
          'Aguarde a conferência do CPF antes de confirmar.', life: 5000
    });
    return false;
  }

  function tmCadValidateRequiredFields(modal, event) {
    if (!modal || !tmCadIsPrimeiraVez(modal)) return true;
    modal.dataset.tmCadValidationAttempted = '1';
    tmCadRefreshRequiredWarnings(modal, true);
    const problems = tmCadRequiredProblems(modal);
    const missing = problems.filter((item) => item.missing);
    const malformed = problems.filter((item) => item.malformed);
    if (!missing.length && !malformed.length) return tmCadGuardCpfLookup(modal, event);

    const message = missing.length || malformed.length !== 1 ? 'Verificar preenchimento dos campos.' :
      malformed[0].key === 'cpf' ? 'Informe um CPF válido.' :
      malformed[0].key === 'celular' ? 'Informe um celular válido.' :
      'Verificar preenchimento dos campos.';

    event?.preventDefault();
    event?.stopImmediatePropagation();
    const component = tmCadBookingComponent(modal);
    component?.$toast?.add({ severity: 'error', summary: 'Atenção', detail: message, life: 5000 });
    if (!component) console.warn('[TM] Balão do Klingo indisponível para validar o cadastro.');
    (missing[0] || malformed[0])?.control?.focus();
    return false;
  }

  function tmCadIsPrimeiraVez(modal) {
    if (!modal || modal.id !== 'cadastroModal') return false;
    if (modal.classList.contains('tm-paciente-layout')) return false;

    const title = tmCadNorm(modal.querySelector('.modal-title')?.innerText || modal.querySelector('.modal-title')?.textContent || '');

    if (/Remarcação de/i.test(modal.innerText || modal.textContent || '')) return false;
    if (/Editar Marcação/i.test(title)) return false;
    if (tmCadHasLabel(modal, 'Nome do Paciente')) return false;

    return (
      tmCadHasLabel(modal, 'Sexo') &&
      tmCadHasLabel(modal, 'Data de Nascimento') &&
      tmCadHasLabel(modal, 'Nome') &&
      tmCadHasLabel(modal, 'CPF') &&
      tmCadHasLabel(modal, 'Origem de Pacientes|Origem do Agendamento')
    );
  }

  function tmCadResetFieldClass(field) {
    if (!field) return;

    field.classList.remove(
      'col-md-1', 'col-md-2', 'col-md-3', 'col-md-4', 'col-md-5', 'col-md-6',
      'col-md-7', 'col-md-8', 'col-md-9', 'col-md-10', 'col-md-11', 'col-md-12',
      'tm-cad-col', 'tm-cad-col-4', 'tm-cad-col-6',
      'tm-cad-order-nome', 'tm-cad-order-nascimento', 'tm-cad-order-cpf',
      'tm-cad-order-celular', 'tm-cad-order-email', 'tm-cad-order-origem',
      'tm-cad-order-sexo', 'tm-cad-order-carteira', 'tm-cad-order-validade',
      'tm-cad-origem-col'
    );

    field.classList.add('col', 'col-12');
  }

  function tmCadSetField(field, sizeClass, orderClass) {
    if (!field) return;

    tmCadResetFieldClass(field);
    field.classList.add('tm-cad-col', sizeClass, orderClass);
  }

  function tmCadHideField(field) {
    if (!field) return;

    field.classList.add('tm-cad-hidden-field');
    field.style.setProperty('display', 'none', 'important');
  }

  function tmCadHidePhoneCountry(field) {
    if (!field) return;
    for (const control of field.querySelectorAll('button, select')) {
      if (!/^BR\b/i.test(tmCadNorm(control.textContent))) continue;
      const wrapper = control.closest('.input-group-prepend, .btn-group, .dropdown');
      (wrapper && field.contains(wrapper) ? wrapper : control)
        .classList.add('tm-cad-phone-country-hidden');
    }
  }

  function tmCadPlaceOrigemInDados(modal, origemField) {
    if (!modal || !origemField) return;

    const cadTemp = modal.querySelector('#cadTemp');
    if (!cadTemp) return;

    let inlineRow = cadTemp.querySelector(':scope > .tm-cad-origem-inline-row');
    if (!inlineRow) {
      inlineRow = document.createElement('div');
      inlineRow.className = 'form-row tm-cad-origem-inline-row';
      cadTemp.appendChild(inlineRow);
    }

    if (origemField.parentElement !== inlineRow) {
      inlineRow.appendChild(origemField);
    }
  }

  function tmCadFindObservacaoRow(modal) {
    if (!modal) return null;

    const rows = Array.from(modal.querySelectorAll('.form-row')).filter((row) => row instanceof HTMLElement);

    for (const row of rows) {
      const directCols = Array.from(row.children).filter((child) => {
        return child instanceof HTMLElement && child.classList.contains('col');
      });

      if (directCols.length < 2) continue;

      const obsCol = directCols.find((col) => {
        return !!col.querySelector(':scope input.form.form-control') && !col.querySelector(':scope select');
      });

      const auxCol = directCols.find((col) => {
        return (
          !!col.querySelector(':scope select.form.form-control') &&
          !!col.querySelector(':scope .fa-fw.fas.fa-question.text-muted, :scope .fa-question') &&
          !col.querySelector(':scope small.form-text.text-muted')
        );
      });

      if (!obsCol || !auxCol) continue;

      const previousText = tmCadNorm(row.previousElementSibling?.innerText || row.previousElementSibling?.textContent || '');
      const nearObservationTitle = previousText === 'Observação' || previousText.includes('Observação');

      // Este é o HTML exato informado: primeira coluna input, segunda coluna select com ícone ?.
      // Preferir a linha logo abaixo do título Observação, mas aceitar a primeira estrutura exata encontrada.
      if (nearObservationTitle || !row.dataset.tmObservationCandidateChecked) {
        row.dataset.tmObservationCandidateChecked = '1';
        return { row, obsCol, auxCol };
      }
    }

    return null;
  }

  function tmCadForceFullCol(col, extraClass) {
    if (!col) return;

    col.classList.remove(
      'col-md-1', 'col-md-2', 'col-md-3', 'col-md-4', 'col-md-5', 'col-md-6',
      'col-md-7', 'col-md-8', 'col-md-9', 'col-md-10', 'col-md-11', 'col-md-12'
    );

    col.classList.add('col', 'col-12', extraClass);
    col.style.setProperty('display', 'block', 'important');

    if (extraClass === 'tm-cad-observacao-aux-col') {
      col.style.setProperty('flex', '0 0 min(353.78px, 100%)', 'important');
      col.style.setProperty('max-width', 'min(353.78px, 100%)', 'important');
      col.style.setProperty('width', 'min(353.78px, 100%)', 'important');
      return;
    }

    col.style.setProperty('flex', '0 0 100%', 'important');
    col.style.setProperty('max-width', '100%', 'important');
    col.style.setProperty('width', '100%', 'important');
  }

  function tmCadMoveObservacaoSelect(modal) {
    const found = tmCadFindObservacaoRow(modal);
    if (!found) return;

    const { row, obsCol, auxCol } = found;

    row.classList.add('tm-cad-observacao-row');
    row.style.setProperty('display', 'flex', 'important');
    row.style.setProperty('flex-wrap', 'wrap', 'important');
    row.style.setProperty('width', '100%', 'important');
    row.style.setProperty('flex', '0 0 100%', 'important');
    row.style.setProperty('max-width', '100%', 'important');
    row.style.setProperty('order', '100', 'important');

    tmCadForceFullCol(obsCol, 'tm-cad-observacao-col');
    tmCadForceFullCol(auxCol, 'tm-cad-observacao-aux-col');

    obsCol.style.setProperty('padding-left', '5px', 'important');
    obsCol.style.setProperty('padding-right', '5px', 'important');
    obsCol.style.setProperty('box-sizing', 'border-box', 'important');

    const obsInputGroup = obsCol.querySelector('.input-group');
    if (obsInputGroup) {
      obsInputGroup.style.setProperty('width', 'calc(100% + 10px)', 'important');
      obsInputGroup.style.setProperty('max-width', 'calc(100% + 10px)', 'important');
    }

    const obsInput = obsCol.querySelector('input.form-control');
    if (obsInput) {
      obsInput.style.setProperty('width', '100%', 'important');
      obsInput.style.setProperty('max-width', '100%', 'important');
    }

    obsCol.style.setProperty('order', '1', 'important');
    auxCol.style.setProperty('order', '2', 'important');
    auxCol.style.setProperty('margin-top', '4px', 'important');
    auxCol.style.setProperty('flex', '0 0 min(353.78px, 100%)', 'important');
    auxCol.style.setProperty('max-width', 'min(353.78px, 100%)', 'important');
    auxCol.style.setProperty('width', 'min(353.78px, 100%)', 'important');

    const inputGroup = auxCol.querySelector('.input-group');
    if (inputGroup) {
      inputGroup.style.setProperty('display', 'flex', 'important');
      inputGroup.style.setProperty('flex-wrap', 'nowrap', 'important');
      inputGroup.style.setProperty('width', 'min(353.78px, 100%)', 'important');
      inputGroup.style.setProperty('max-width', 'min(353.78px, 100%)', 'important');
    }

    const prepend = auxCol.querySelector('.input-group-prepend');
    if (prepend) {
      prepend.style.setProperty('display', 'flex', 'important');
      prepend.style.setProperty('flex', '0 0 auto', 'important');
    }

    const select = auxCol.querySelector('select');
    if (select) {
      select.style.setProperty('flex', '1 1 auto', 'important');
      select.style.setProperty('width', 'auto', 'important');
      select.style.setProperty('min-width', '0', 'important');
    }
  }

  function tmCadDispatchNativeInput(el) {
    if (!el) return;

    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function tmCadSetInputValue(el, value) {
    if (!el) return;

    el.value = value || '';
    tmCadDispatchNativeInput(el);
  }

  function tmCadExtractPatientClipboard(rawText) {
    const text = String(rawText || '').replace(/\r\n/g, '\n').trim();
    if (!text) return null;

    const data = {};

    const lines = text
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    lines.forEach((line) => {
      const match = line.match(/^(Nome|Nascimento|CPF|E-mail|Email|Telefone|Celular)\s*:?\s*(.+)$/i);
      if (!match) return;

      const key = match[1].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const value = match[2].trim();

      if (key === 'nome') data.nome = value;
      if (key === 'nascimento') data.nascimento = value;
      if (key === 'cpf') data.cpf = value;
      if (key === 'e-mail' || key === 'email') data.email = value;
      if (key === 'telefone' || key === 'celular') data.celular = value;
    });

    const hasMinimumData = !!(data.nome || data.nascimento || data.cpf || data.email || data.celular);
    const hasExplicitLabel = lines.some((line) =>
      /^(Nome|Nascimento|CPF|E-mail|Email|Telefone|Celular)\s*:/i.test(line)
    );

    if (!hasMinimumData || (!hasExplicitLabel && Object.keys(data).length < 2)) return null;

    return data;
  }

  function tmCadFindInputInField(modal, labelText) {
    const field = tmCadFieldByLabel(modal, labelText);
    if (!field) return null;

    return field.querySelector('input.form-control, input, select.form-control, select, textarea.tm-cad-observacao-textarea, textarea');
  }

  function tmCadNormalizeCpf(value) {
    return String(value || '').trim();
  }

  function tmCadNormalizePhone(value) {
    return String(value || '').trim();
  }

  function tmCadApplyPatientClipboard(modal, data) {
    if (!modal || !data) return false;

    const nomeInput = tmCadFindInputInField(modal, 'Nome');
    const nascimentoInput = tmCadFindInputInField(modal, 'Data de Nascimento');
    const cpfInput = tmCadFindInputInField(modal, 'CPF');
    const emailInput = tmCadFindInputInField(modal, 'e-mail');
    const celularField = tmCadFieldByLabel(modal, 'Celular');
    const celularInput = celularField?.querySelector('input.form-control, input');

    if (data.nome && nomeInput) {
      tmCadSetInputValue(nomeInput, data.nome);
    }

    if (data.nascimento && nascimentoInput) {
      const parsedDate = tmCadParseClipboardDate(data.nascimento);
      if (parsedDate) tmCadSetInputValue(nascimentoInput, parsedDate);
    }

    if (data.cpf && cpfInput) {
      tmCadSetInputValue(cpfInput, tmCadNormalizeCpf(data.cpf));
    }

    if (data.email && emailInput) {
      tmCadSetInputValue(emailInput, data.email);
    }

    if (data.celular && celularInput) {
      tmCadSetInputValue(celularInput, tmCadNormalizePhone(data.celular));
    }

    return true;
  }

  function tmCadEnablePatientClipboardPaste(modal) {
    if (!modal || modal.dataset.tmPatientClipboardPasteEnabled === '1') return;

    modal.dataset.tmPatientClipboardPasteEnabled = '1';

    modal.addEventListener('paste', (event) => {
      if (!modal.classList.contains('tm-primeira-vez-layout')) return;

      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const cadTemp = modal.querySelector('#cadTemp');
      if (!cadTemp || !cadTemp.contains(target)) return;

      const rawText = event.clipboardData?.getData('text/plain') || '';
      const parsed = tmCadExtractPatientClipboard(rawText);

      if (!parsed) return;

      event.preventDefault();
      event.stopPropagation();

      tmCadApplyPatientClipboard(modal, parsed);

      const nomeInput = tmCadFindInputInField(modal, 'Nome');
      if (nomeInput) {
        nomeInput.focus({ preventScroll: true });
      }
    }, true);
  }

  function tmCadParseClipboardDate(rawValue) {
    return tmParseDateInput(rawValue);
  }
  function tmCadEnableDatePaste(field) {
    if (!field || field.dataset.tmDatePasteEnabled === '1') return;

    const input = field.querySelector('input[type="date"].form-control, input[type="date"]');
    if (!input) return;

    field.dataset.tmDatePasteEnabled = '1';

    input.addEventListener('paste', (event) => {
      const clipboardText = event.clipboardData?.getData('text/plain') || '';
      const parsed = tmCadParseClipboardDate(clipboardText);

      if (!parsed) return;

      event.preventDefault();

      input.value = parsed;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, true);
  }

  function tmCadProtectBirthDate(field) {
    const input = field?.querySelector('input[type="date"]');
    if (!input || input.dataset.tmBirthDateDigitGuard === '1') return;
    input.dataset.tmBirthDateDigitGuard = '1';
    let lastValue = input.value;
    let yearDigits = 0;
    let yearActive = false;
    let replacement = '';
    let writing = false;
    const parts = (value) => /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    const reset = () => {
      lastValue = input.value;
      yearDigits = 0;
      yearActive = false;
      replacement = '';
    };
    input.addEventListener('pointerdown', reset, true);
    input.addEventListener('focus', reset, true);
    input.addEventListener('keydown', (event) => {
      if (/^(?:Arrow|Backspace|Delete|Tab|Home|End)/.test(event.key)) {
        reset();
        return;
      }
      if (!/^\d$/.test(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
      const current = parts(input.value);
      if (!current || (!replacement && (!yearActive || yearDigits < 4))) return;

      // O Chrome apaga o input date quando o ano recebe um quinto dígito.
      // Reinicia somente a edição do ano; dia e mês permanecem nativos.
      event.preventDefault();
      replacement = replacement.length === 4 ? event.key : replacement + event.key;
      const year = replacement.padStart(4, '0');
      if (Number(year) === 0) return;
      const next = `${year}-${current[2]}-${current[3]}`;
      if (input.value !== next) {
        writing = true;
        input.value = next;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        writing = false;
      }
      lastValue = input.value;
      yearActive = true;
      yearDigits = replacement.length;
    }, true);
    input.addEventListener('input', () => {
      if (writing) return;
      const before = parts(lastValue);
      const after = parts(input.value);
      if (after && (!before || before[1] !== after[1]) &&
          (!before || (before[2] === after[2] && before[3] === after[3]))) {
        yearActive = true;
        yearDigits = Math.min(4, yearDigits + 1);
      } else if (!after || (before && (before[2] !== after[2] || before[3] !== after[3]))) {
        yearActive = false;
        yearDigits = 0;
        replacement = '';
      }
      lastValue = input.value;
    }, true);
  }

  function tmCadEnableDatePastes(modal) {
    const nascimento = tmCadFieldByLabel(modal, 'Data de Nascimento');
    tmCadEnableDatePaste(nascimento);
    tmCadProtectBirthDate(nascimento);
    tmCadEnableDatePaste(tmCadFieldByLabel(modal, 'Validade da Carteira'));
  }

  function tmCadFocusableInField(field) {
    if (!field) return null;

    return field.querySelector('textarea.tm-cad-observacao-textarea, input:not([type="hidden"]), select, textarea, button');
  }

  function tmCadApplyTabOrder(modal) {
    if (!modal) return;

    const ordered = [
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'Nome')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'Data de Nascimento')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'CPF')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'Celular')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'e-mail')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'Sexo')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'No. da Carteira do Plano')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'Validade da Carteira')),
      tmCadFocusableInField(tmCadFieldByLabel(modal, 'Origem de Pacientes|Origem do Agendamento')),
      modal.querySelector('.tm-cad-observacao-textarea'),
      tmCadFindObservacaoRow(modal)?.auxCol?.querySelector('select.form.form-control, select')
    ].filter(Boolean);

    ordered.forEach((el, index) => {
      el.setAttribute('tabindex', String(index + 1));
    });

    modal.querySelectorAll('.tm-cad-hidden-field input, .tm-cad-hidden-field select, input.tm-cad-observacao-original-input-hidden').forEach((el) => {
      el.setAttribute('tabindex', '-1');
    });
  }

  function tmCadFocusNomeOnce(modal) {
    if (!modal || modal.dataset.tmNomeInitialFocusDone === '1') return;
    const nomeInput = tmCadFocusableInField(tmCadFieldByLabel(modal, 'Nome'));
    if (!nomeInput) return;

    modal.dataset.tmNomeInitialFocusDone = '1';
    window.setTimeout(() => {
      if (modal.classList.contains('tm-primeira-vez-layout') && nomeInput.isConnected) {
        nomeInput.focus({ preventScroll: true });
      }
    }, 50);
  }
  function tmCadHeaderMonthName(monthShort) {
    const key = String(monthShort || '').trim().toLowerCase();

    const map = {
      jan: 'Janeiro',
      fev: 'Fevereiro',
      mar: 'Março',
      abr: 'Abril',
      mai: 'Maio',
      jun: 'Junho',
      jul: 'Julho',
      ago: 'Agosto',
      set: 'Setembro',
      out: 'Outubro',
      nov: 'Novembro',
      dez: 'Dezembro'
    };

    return map[key] || monthShort;
  }

  function tmCadHeaderWeekdayName(dayShort) {
    const key = String(dayShort || '').trim().toLowerCase();

    const map = {
      dom: 'Domingo',
      seg: 'Segunda-feira',
      ter: 'Terça-feira',
      qua: 'Quarta-feira',
      qui: 'Quinta-feira',
      sex: 'Sexta-feira',
      sab: 'Sábado',
      sáb: 'Sábado'
    };

    return map[key] || dayShort;
  }

  function tmCadNormalizeHeaderDate(dateBlock) {
    if (!dateBlock) return;

    const calendarSmall = Array.from(dateBlock.querySelectorAll('small')).find((small) => {
      return !!small.querySelector('.fa-calendar-alt');
    });

    if (!calendarSmall) return;

    const rawText = String(calendarSmall.textContent || '').replace(/\s+/g, ' ').trim();
    const badge = calendarSmall.querySelector('.badge');

    const dayMatch = rawText.match(/(\d{1,2})\s*\/\s*([A-Za-zÀ-ÿ]{3})/i);
    const weekday = tmCadHeaderWeekdayName(badge?.textContent || '');

    if (!dayMatch) return;

    const day = String(parseInt(dayMatch[1], 10));
    const monthName = tmCadHeaderMonthName(dayMatch[2]);

    const icon = calendarSmall.querySelector('i');

    calendarSmall.textContent = '';

    if (icon) {
      calendarSmall.appendChild(icon);
    }

    calendarSmall.appendChild(document.createTextNode(`${day} de ${monthName} | ${weekday}`.toUpperCase()));

    dateBlock.dataset.tmHeaderDateNormalized = '1';
  }

  function tmCadAddProcedureEmoji(title) {
    if (!title || title.querySelector(':scope > .tm-cad-header-procedure-emoji')) return;
    const icon = document.createElement('span');
    icon.className = 'tm-cad-header-procedure-emoji';
    icon.textContent = '🩺';
    icon.setAttribute('aria-hidden', 'true');
    title.prepend(icon);
  }

  function tmCadEmojifyHeaderIcon(container, selector, emoji) {
    const icon = container?.querySelector(selector);
    if (!icon) return;
    icon.classList.add('tm-cad-native-icon-hidden');
    if (icon.previousElementSibling?.classList.contains('tm-cad-header-emoji')) {
      icon.previousElementSibling.textContent = emoji;
      return;
    }

    const replacement = document.createElement('span');
    replacement.className = 'tm-cad-header-emoji';
    replacement.textContent = emoji;
    replacement.setAttribute('aria-hidden', 'true');
    icon.before(replacement);
  }

  function tmCadDecorateHeader(profissional, convenio, unidade, dateBlock) {
    tmCadEmojifyHeaderIcon(profissional, '.fa-user-md', '👨‍⚕️');
    tmCadEmojifyHeaderIcon(convenio, '.fa-credit-card', '💳');
    tmCadEmojifyHeaderIcon(unidade, '.fa-building', '🏥');

    const dateSmall = Array.from(dateBlock.querySelectorAll('small'))
      .find((small) => !!small.querySelector('.fa-calendar-alt'));
    const timeSmall = Array.from(dateBlock.querySelectorAll('small'))
      .find((small) => small !== dateSmall && /\d{1,2}:\d{2}/.test(small.textContent || ''));

    dateSmall?.classList.add('tm-cad-header-date-line');
    timeSmall?.classList.add('tm-cad-header-time-line');
    tmCadEmojifyHeaderIcon(dateSmall, '.fa-calendar-alt', '📅');
    tmCadEmojifyHeaderIcon(timeSmall, 'i', '🕒');
  }

  function tmCadGetExternalConvenioForHeaderList(listGroup) {
    if (!listGroup) return '';

    const convenioItem = Array.from(listGroup.children).find((item) => {
      if (!(item instanceof HTMLElement)) return false;
      if (!item.matches('li.list-group-item')) return false;
      if (item.querySelector('label .h4')) return false;
      return !!item.querySelector('.fa-credit-card');
    });

    const small = convenioItem?.querySelector('small.lead');
    const textValue = tmCadNorm(small?.innerText || small?.textContent || '');

    if (textValue) {
      convenioItem.classList.add('tm-cad-convenio-externo-oculto');
    }

    return textValue;
  }

  function tmCadBuildConvenioRowFromText(textValue) {
    const row = document.createElement('span');
    row.className = 'mr-3 tm-cad-header-row tm-cad-header-convenio tm-cad-header-convenio-injetado';
    row.dataset.tmInjected = '1';

    const small = document.createElement('small');
    small.className = 'lead';

    const icon = document.createElement('i');
    icon.className = 'far fa-credit-card fa-fw mr-1';
    icon.setAttribute('aria-hidden', 'true');

    small.appendChild(icon);
    small.appendChild(document.createTextNode(` ${textValue} `));
    row.appendChild(small);

    return row;
  }

  function tmCadPositionOcuparButton(item) {
    const button = Array.from(item.querySelectorAll('button'))
      .find((candidate) => /^Ocupar\b/i.test(tmCadNorm(candidate.textContent)));
    if (!button) return;
    const group = button.closest('.btn-group, .dropdown');
    const target = group && item.contains(group) ? group : button;
    target.classList.add('tm-cad-header-ocupar');
  }

  function tmCadHeaderNeedsLayout(modal) {
    return Array.from(modal.querySelectorAll('ul.list-group > li.list-group-item')).some((item) => {
      const title = item.querySelector('label .h4');
      if (!title || !item.querySelector('label .fa-user-md') ||
          !item.querySelector('label .fa-calendar-alt')) return false;
      return !item.classList.contains('tm-cad-header-card') ||
        !title.querySelector('.tm-cad-header-procedure-emoji') ||
        !item.querySelector('label .tm-cad-header-info-wrap') ||
        !item.querySelector('label .tm-cad-header-date-line');
    });
  }

  function tmCadApplyHeaderLayout(modal) {
    if (!modal) return;

    const listGroups = Array.from(modal.querySelectorAll('ul.list-group'));

    listGroups.forEach((listGroup) => {
      const externalConvenioText = tmCadGetExternalConvenioForHeaderList(listGroup);

      const headerItems = Array.from(listGroup.children).filter((item) => {
        return (
          item instanceof HTMLElement &&
          item.matches('li.list-group-item') &&
          !!item.querySelector('label .h4') &&
          !!item.querySelector('label .fa-user-md') &&
          !!item.querySelector('label .fa-calendar-alt')
        );
      });

      if (headerItems.length > 1) {
        modal.classList.add('tm-cad-multiple-headers');
        listGroup.classList.add('tm-cad-multiple-headers');
      } else {
        listGroup.classList.remove('tm-cad-multiple-headers');
      }

      headerItems.forEach((item) => {
        const title = item.querySelector('label .h4');
        const infoWrap = item.querySelector('label .d-flex.justify-content-between');
        if (!title || !infoWrap) return;

        const left = infoWrap.querySelector(':scope > div:first-child');
        // Na retomada de rascunho o Klingo pode remontar a coluna da data sem
        // a classe `lead`; ela continua sendo a segunda coluna do cabeçalho.
        const dateBlock = infoWrap.querySelector(':scope > div.lead, :scope > div:not(:first-child)');

        if (!left || !dateBlock) return;

        const injectedConvenio = left.querySelector('.tm-cad-header-convenio-injetado');
        if (injectedConvenio && tmCadNorm(injectedConvenio.textContent) !== externalConvenioText) {
          injectedConvenio.remove();
        }

        const spans = Array.from(left.querySelectorAll(':scope > span'));

        let convenio = spans.find((span) => !!span.querySelector('.fa-credit-card'));
        const profissional = spans.find((span) => !!span.querySelector('.fa-user-md'));
        const unidade = spans.find((span) => !!span.querySelector('.fa-building'));

        if (!profissional) return;

        if (!convenio && externalConvenioText) {
          convenio = tmCadBuildConvenioRowFromText(externalConvenioText);
          left.insertBefore(convenio, unidade);
        }

        item.classList.add('tm-cad-header-card');
        tmCadPositionOcuparButton(item);
        title.classList.add('tm-cad-header-title');
        tmCadAddProcedureEmoji(title);
        infoWrap.classList.add('tm-cad-header-info-wrap');
        left.classList.add('tm-cad-header-left');

        profissional.classList.add('tm-cad-header-row', 'tm-cad-header-profissional');
        unidade?.classList.add('tm-cad-header-row', 'tm-cad-header-unidade');
        dateBlock.classList.add('tm-cad-header-data');

        if (convenio) {
          convenio.classList.add('tm-cad-header-row', 'tm-cad-header-convenio');
        }

        unidade?.querySelectorAll('small.text-muted').forEach((small) => {
          small.classList.add('tm-cad-header-sala');
        });

        tmCadNormalizeHeaderDate(dateBlock);
        tmCadDecorateHeader(profissional, convenio, unidade, dateBlock);
      });
    });
  }


  function tmCadEnableObservacaoTextarea(modal) {
    const found = tmCadFindObservacaoRow(modal);
    if (!found) return;

    const { obsCol } = found;
    const inputGroup = obsCol.querySelector('.input-group');
    const originalInput = obsCol.querySelector('input.form-control');

    if (!inputGroup || !originalInput) return;

    originalInput.classList.add('tm-cad-observacao-original-input-hidden');
    originalInput.style.setProperty('display', 'none', 'important');

    let textarea = inputGroup.querySelector('textarea.tm-cad-observacao-textarea');

    if (!textarea) {
      textarea = document.createElement('textarea');
      textarea.className = 'form form-control tm-cad-observacao-textarea';
      textarea.placeholder = originalInput.getAttribute('placeholder') || '';
      textarea.autocomplete = originalInput.getAttribute('autocomplete') || 'off';
      textarea.value = originalInput.value || '';

      textarea.addEventListener('input', () => {
        originalInput.value = textarea.value;
        originalInput.dispatchEvent(new Event('input', { bubbles: true }));
        originalInput.dispatchEvent(new Event('change', { bubbles: true }));
      });

      inputGroup.appendChild(textarea);
    }

    if (document.activeElement !== textarea && textarea.value !== originalInput.value) {
      textarea.value = originalInput.value || textarea.value || '';
    }

    textarea.style.setProperty('width', 'calc(100% + 10px)', 'important');
    textarea.style.setProperty('max-width', 'calc(100% + 10px)', 'important');
    textarea.style.setProperty('height', '95px', 'important');
    textarea.style.setProperty('min-height', '95px', 'important');
    textarea.style.setProperty('box-sizing', 'border-box', 'important');
    textarea.style.setProperty('white-space', 'pre-wrap', 'important');
    textarea.style.setProperty('overflow-wrap', 'break-word', 'important');
    textarea.style.setProperty('word-break', 'break-word', 'important');
  }

  function tmCadHideOrigemPacientesSection(modal) {
    if (!modal) return;

    const labels = Array.from(modal.querySelectorAll('small')).filter((small) => {
      return ['ORIGEM DE PACIENTES', 'ORIGEM DO AGENDAMENTO'].includes(
        tmCadNorm(small.innerText || small.textContent || '').toUpperCase());
    });

    labels.forEach((label) => {
      const title = label.closest('.border-bottom.hover-title-bg');
      if (title && modal.contains(title)) title.classList.add('tm-cad-origem-title-hidden');

      const row = label.closest('.row');
      if (!row || !modal.contains(row)) return;

      const hasConfigModal =
        !!row.querySelector('[id^="formularioConfigModal-fixed-"]') ||
        !!row.querySelector('[id^="selecaoTextoModal"]') ||
        !!row.querySelector('[id^="trocarModeloModal"]') ||
        !!row.querySelector('[id^="anteriorModal-fixed-"]');

      if (!hasConfigModal) return;

      row.classList.add('tm-cad-origem-section-hidden');
      row.style.setProperty('display', 'none', 'important');
    });
  }

  function tmCadClearPrimeiraVezLayout(modal) {
    if (!modal || modal.id !== 'cadastroModal') return;
    const baseline = modalBaselines.get(modal);
    if (!baseline) return;

    modal.querySelectorAll('.tm-cad-header-emoji, .tm-cad-header-procedure-emoji, .tm-cad-header-convenio-injetado, textarea.tm-cad-observacao-textarea')
      .forEach((node) => node.remove());

    const { origem, cpfInput, cpfRequired, cpfAriaRequired, emailInput, emailRequired } = baseline;
    if (origem?.element.isConnected) {
      if (origem.parent.isConnected) {
        const next = origem.next?.parentNode === origem.parent ? origem.next : null;
        origem.parent.insertBefore(origem.element, next);
      } else {
        // A troca de ficha pode substituir o contêiner original. Não deixe o
        // campo ser removido junto com a linha provisória da Primeira Vez.
        const fallback = tmCadFieldByLabel(modal, 'Nome do Paciente')?.closest('.mt-3') ||
          modal.querySelector('#cadTemp');
        fallback?.appendChild(origem.element);
      }
    }
    modal.querySelectorAll('.tm-cad-origem-inline-row').forEach((row) => row.remove());
    modal.querySelectorAll('.tm-cad-required-warning').forEach((warning) => warning.remove());
    // Na troca para uma ficha existente, o Klingo pode destacar a linha de
    // origem antes desta limpeza. O aviso inserido por nós fica fora do modal.
    origem?.element?.querySelectorAll('.tm-cad-required-warning').forEach((warning) => warning.remove());
    if (origem?.element && !origem.element.isConnected) {
      for (const { element, attributes } of baseline.attributes) {
        if (element !== origem.element && !origem.element.contains(element)) continue;
        for (const [name, value] of attributes) {
          if (value === null) element.removeAttribute(name);
          else element.setAttribute(name, value);
        }
      }
    }
    delete modal.dataset.tmCadValidationAttempted;

    if (cpfInput?.isConnected) {
      cpfInput.required = cpfRequired;
      if (cpfAriaRequired === null) cpfInput.removeAttribute('aria-required');
      else cpfInput.setAttribute('aria-required', cpfAriaRequired);
      cpfInput.setCustomValidity('');
    }
    if (emailInput?.isConnected) emailInput.required = emailRequired;

    tmRestoreAttributes(baseline.attributes);
    tmRestoreHeaderContents(baseline.headers);
    modal.classList.remove('tm-primeira-vez-layout', 'tm-cad-multiple-headers');
    delete modal.dataset.tmNomeInitialFocusDone;
    delete modal.dataset.tmNomeInitialFocusLock;
    modal.querySelectorAll('[data-tm-header-date-normalized], [data-tm-observation-candidate-checked]')
      .forEach((element) => {
        delete element.dataset.tmHeaderDateNormalized;
        delete element.dataset.tmObservationCandidateChecked;
      });
    modalBaselines.delete(modal);
  }
  function tmCadApplyPrimeiraVezLayout() {
    const modal = tmCadVisibleModal();
    if (!modal) {
      tmCadClearPrimeiraVezLayout(document.querySelector('#cadastroModal'));
      return;
    }

    if (!tmCadIsPrimeiraVez(modal)) {
      tmCadClearPrimeiraVezLayout(modal);
      tmCadSchedulePendingRestore(modal);
      return;
    }

    if (!modalBaselines.has(modal)) {
      const origemField = tmCadFieldByLabel(modal, 'Origem de Pacientes|Origem do Agendamento');
      const cpfInput = tmCadFieldByLabel(modal, 'CPF')?.querySelector('input');
      const emailInput = tmCadFieldByLabel(modal, 'e-mail')?.querySelector('input');
      modalBaselines.set(modal, {
        attributes: tmCaptureAttributes(modal),
        headers: tmCaptureHeaderContents(modal),
        cpfInput,
        cpfRequired: cpfInput?.required,
        cpfAriaRequired: cpfInput?.getAttribute('aria-required') ?? null,
        emailInput,
        emailRequired: emailInput?.required,
        origem: origemField ? {
          element: origemField,
          parent: origemField.parentNode,
          next: origemField.nextSibling
        } : null
      });
    }

    tmCadInjectStyle();
    modal.classList.add('tm-primeira-vez-layout');

    const nome = tmCadFieldByLabel(modal, 'Nome');
    const nascimento = tmCadFieldByLabel(modal, 'Data de Nascimento');
    const cpf = tmCadFieldByLabel(modal, 'CPF');

    const celular = tmCadFieldByLabel(modal, 'Celular');
    const email = tmCadFieldByLabel(modal, 'e-mail');
    const origem = tmCadFieldByLabel(modal, 'Origem de Pacientes|Origem do Agendamento');

    const sexo = tmCadFieldByLabel(modal, 'Sexo');
    const carteira = tmCadFieldByLabel(modal, 'No. da Carteira do Plano');
    const validade = tmCadFieldByLabel(modal, 'Validade da Carteira');

    const telefone = tmCadFieldByLabel(modal, 'Telefone');
    const nomeSocial = tmCadFieldByLabel(modal, 'Nome Social');

    tmCadSetField(nome, 'tm-cad-col-4', 'tm-cad-order-nome');
    tmCadSetField(nascimento, 'tm-cad-col-4', 'tm-cad-order-nascimento');
    tmCadSetField(cpf, 'tm-cad-col-4', 'tm-cad-order-cpf');

    tmCadSetField(celular, 'tm-cad-col-4', 'tm-cad-order-celular');
    tmCadHidePhoneCountry(celular);
    tmCadSetField(email, 'tm-cad-col-4', 'tm-cad-order-email');
    tmCadSetField(sexo, 'tm-cad-col-4', 'tm-cad-order-sexo');

    tmCadSetField(carteira, 'tm-cad-col-4', 'tm-cad-order-carteira');
    tmCadSetField(validade, 'tm-cad-col-4', 'tm-cad-order-validade');
    tmCadSetField(origem, 'tm-cad-col-4', 'tm-cad-order-origem');
    origem?.classList.add('tm-cad-origem-col');

    tmCadPlaceOrigemInDados(modal, origem);

    tmCadHideField(telefone);
    tmCadHideField(nomeSocial);
    tmCadHideField(email);
    const cpfInput = cpf?.querySelector('input');
    if (cpfInput) {
      // A obrigatoriedade é verificada antes de confirmar; o HTML5 não deve
      // substituir o aviso padrão do Klingo pelo balão do navegador.
      cpfInput.required = false;
      cpfInput.setAttribute('aria-required', 'true');
    }
    const emailInput = email?.querySelector('input');
    if (emailInput) emailInput.required = false;
    tmCadRefreshRequiredWarnings(modal, modal.dataset.tmCadValidationAttempted === '1');
    tmCadLookupCpf(modal);

    tmCadApplyHeaderLayout(modal);
    tmCadMoveObservacaoSelect(modal);
    tmCadEnableObservacaoTextarea(modal);
    tmCadEnableDatePastes(modal);
    tmCadEnablePatientClipboardPaste(modal);
    tmCadApplyTabOrder(modal);
    tmCadFocusNomeOnce(modal);
    tmCadHideOrigemPacientesSection(modal);
  }

  document.addEventListener('shown.bs.modal', (event) => {
    if (event.target?.id === 'cadastroModal') {
      window.setTimeout(tmCadApplyPrimeiraVezLayout, 0);
      window.setTimeout(tmCadApplyPrimeiraVezLayout, 100);
    }
  }, true);

  document.addEventListener('hidden.bs.modal', (event) => {
    if (event.target?.id === 'cadastroModal') {
      tmCadClearPrimeiraVezLayout(event.target);
    }
  }, true);

  document.addEventListener('click', (event) => {
    if (!window.location.hash.startsWith('#/call-center')) return;
    const button = event.target?.closest?.('button');
    const modal = button?.closest?.('#cadastroModal');
    if (modal && /^Confirmar$/i.test(tmCadNorm(button.textContent))) {
      tmCadValidateRequiredFields(modal, event);
    }
  }, true);

  document.addEventListener('submit', (event) => {
    if (!window.location.hash.startsWith('#/call-center')) return;
    const modal = event.target?.closest?.('#cadastroModal');
    if (modal && !/^Reservar$/i.test(tmCadNorm(event.submitter?.textContent))) {
      tmCadValidateRequiredFields(modal, event);
    }
  }, true);

  for (const name of ['input', 'change']) {
    document.addEventListener(name, (event) => {
      const modal = event.target?.closest?.('#cadastroModal.tm-primeira-vez-layout');
      if (!modal || modal.dataset.tmCadValidationAttempted !== '1' || !event.target.matches('input, select')) return;
      const field = event.target.closest('.tm-cad-order-nome, .tm-cad-order-nascimento, .tm-cad-order-cpf, .tm-cad-order-celular, .tm-cad-order-origem, .tm-cad-order-sexo');
      if (!field) return;
      tmCadRefreshRequiredWarnings(modal, true);
    }, true);
  }

  for (const name of ['input', 'change']) document.addEventListener(name, (event) => {
    const modal = event.target?.closest?.('#cadastroModal, #novoAtendimento2Modal, #editarMarcacaoModal');
    if (!modal || !modal.querySelector('#cadTemp')?.contains(event.target)) return;
    window.setTimeout(() => tmCadLookupCpf(modal), 0);
  }, true);

  document.addEventListener('shown.bs.modal', (event) => {
    if (!['novoAtendimento2Modal', 'editarMarcacaoModal'].includes(event.target?.id)) return;
    const modal = event.target;
    window.setTimeout(() => {
      const root = modal.querySelector('#cadTemp');
      if (!root) return;
      let observer = otherCpfObservers.get(modal);
      if (!observer) {
        observer = new MutationObserver(() => tmCadLookupCpf(modal));
        otherCpfObservers.set(modal, observer);
      }
      observer.observe(root, { childList: true, subtree: true });
      tmCadLookupCpf(modal);
    }, 0);
  }, true);

  document.addEventListener('hidden.bs.modal', (event) => {
    otherCpfObservers.get(event.target)?.disconnect();
    pendingCpfTransfers.delete(event.target);
    const state = cpfLookups.get(tmCadCadastroComponent(event.target));
    if (state) {
      state.generation += 1;
      state.pending = false;
      state.done = false;
      state.selectedCpf = '';
    }
  }, true);

  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button');
    const modal = button?.closest?.('#novoAtendimento2Modal, #editarMarcacaoModal');
    if (!modal || !/^(Concluir|Atualizar)$/i.test(tmCadNorm(button.textContent))) return;
    tmCadGuardCpfLookup(modal, event);
  }, true);

  // O observador roda na microtarefa em que o modal se torna visível, antes
  // de a fila geral (80 ms) ou o evento "shown" deixarem o layout original pintar.
  let observedCadastroModal = null;

  function applyPrimeiraVezBeforePaint() {
    const modal = observedCadastroModal;
    if (!modal?.isConnected || tmCadVisibleModal() !== modal || !tmCadIsPrimeiraVez(modal)) return;
    if (modal.classList.contains('tm-primeira-vez-layout')) {
      if (tmCadHeaderNeedsLayout(modal)) tmCadApplyHeaderLayout(modal);
      return;
    }
    tmCadApplyPrimeiraVezLayout();
  }

  function observeCadastroModal(modal) {
    if (modal === observedCadastroModal) return;
    observedCadastroModal = modal;
    if (!modal) return;

    applyPrimeiraVezBeforePaint();
  }

  tmBookingModalWatch.subscribe((modal) => {
    if (modal !== observedCadastroModal) observeCadastroModal(modal);
    else if (modal?.classList.contains('tm-primeira-vez-layout') &&
        tmCadHasLabel(modal, 'Nome do Paciente')) {
      // Limpar antes do observador do layout Paciente capturar o novo estado.
      tmCadClearPrimeiraVezLayout(modal);
      tmCadSchedulePendingRestore(modal);
    } else applyPrimeiraVezBeforePaint();
  });

  tmRuntime.register('cadastro de primeira vez', tmCadApplyPrimeiraVezLayout, ['#/call-center']);
})();

/* =========================
   MODAL AGENDAMENTO - PACIENTE
   layout do cadastro de paciente existente
========================= */
(function () {
  'use strict';

  const STYLE_ID = 'tm-cadastro-paciente-layout-23-0';
  const modalBaselines = new WeakMap();

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #cadastroModal.tm-paciente-layout {
        text-align: center !important;
      }

      #cadastroModal.tm-paciente-layout .modal-dialog {
        width: 800px !important;
        max-width: calc(100vw - 24px) !important;
        margin-left: auto !important;
        margin-right: auto !important;
        text-align: left !important;
      }

      #cadastroModal.tm-paciente-layout .modal-content {
        width: 800px !important;
        max-width: 100% !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid {
        display: grid !important;
        grid-template-columns: 200px minmax(0, 1fr) 200px 200px !important;
        column-gap: 10px !important;
        row-gap: 4px !important;
        align-items: start !important;
        width: 100% !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid > .form-row,
      #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid > .tm-paciente-origem-inline-row {
        display: contents !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid > .tm-paciente-dados-heading {
        grid-column: 1 / -1 !important;
        grid-row: 1 !important;
        width: 100% !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-field {
        flex: initial !important;
        max-width: none !important;
        width: auto !important;
        min-width: 0 !important;
        padding-left: 0 !important;
        padding-right: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-field input,
      #cadastroModal.tm-paciente-layout .tm-paciente-field select,
      #cadastroModal.tm-paciente-layout .tm-paciente-field .input-group {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid .tm-paciente-field .form-control {
        font-family: "Open Sans", "Helvetica Neue", sans-serif !important;
        font-size: 13.125px !important;
        font-weight: 400 !important;
        color: #495057 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-field .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-field .input-group > .form-control {
        flex: 1 1 auto !important;
        width: auto !important;
        min-width: 0 !important;
        max-width: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-field .input-group > .input-group-prepend,
      #cadastroModal.tm-paciente-layout .tm-paciente-field .input-group > .input-group-append {
        display: flex !important;
        flex: 0 0 auto !important;
        width: auto !important;
        max-width: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-nome input,
      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento input,
      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento .input-group,
      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento .input-group-text,
      #cadastroModal.tm-paciente-layout .tm-paciente-sexo select,
      #cadastroModal.tm-paciente-layout .tm-paciente-celular input,
      #cadastroModal.tm-paciente-layout .tm-paciente-email input,
      #cadastroModal.tm-paciente-layout .tm-paciente-telefone input {
        height: 29.18px !important;
        min-height: 29.18px !important;
        max-height: 29.18px !important;
        line-height: 1.2 !important;
        padding-top: 3px !important;
        padding-bottom: 3px !important;
        box-sizing: border-box !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-nome {
        grid-column: 1 / 3 !important;
        grid-row: 2 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-perfil-append button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        height: 100% !important;
        min-width: 36px !important;
        padding: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-perfil-append button i {
        display: block !important;
        margin: 0 !important;
        line-height: 1 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento {
        grid-column: 3 !important;
        grid-row: 2 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-cpf {
        grid-column: 4 !important;
        grid-row: 2 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-celular {
        grid-column: 1 !important;
        grid-row: 3 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-telefone {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento .input-group,
      #cadastroModal.tm-paciente-layout .tm-paciente-validade .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento .input-group {
        margin-top: -3px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento .input-group-text {
        font-family: "Open Sans", "Helvetica Neue", sans-serif !important;
        font-size: 13.125px !important;
        font-weight: 400 !important;
        color: #495057 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento .input-group > .form-control,
      #cadastroModal.tm-paciente-layout .tm-paciente-validade .input-group > .form-control {
        flex: 1 1 auto !important;
        width: auto !important;
        min-width: 0 !important;
        max-width: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-nascimento .input-group > .input-group-append,
      #cadastroModal.tm-paciente-layout .tm-paciente-validade .input-group > .input-group-append {
        display: flex !important;
        flex: 0 0 auto !important;
        width: auto !important;
        max-width: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-email {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-warning-host {
        position: relative !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-required-warning {
        position: absolute !important;
        z-index: 3;
        display: none;
        align-items: center;
        justify-content: center;
        width: 24px;
        color: #dc3545;
        background: #f8d7da;
        border-right: 1px solid #f5c6cb;
        border-radius: 3px 0 0 3px;
        font-weight: 700;
        pointer-events: none;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-required-warning.tm-paciente-warning-visible {
        display: inline-flex;
      }

      #cadastroModal.tm-paciente-layout .input-group:has(> .input-group-prepend > .input-group-text.invalid) > .tm-paciente-required-warning {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-warning-control {
        padding-left: 30px !important;
      }

      #cadastroModal.tm-paciente-layout .input-group:has(> .input-group-prepend > .input-group-text.invalid) > .tm-paciente-warning-control {
        padding-left: 6px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-sexo {
        grid-column: 4 !important;
        grid-row: 3 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-carteira {
        grid-column: 1 / 3 !important;
        grid-row: 4 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-validade {
        grid-column: 3 !important;
        grid-row: 4 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-origem {
        grid-column: 2 / 4 !important;
        grid-row: 3 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-origem .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-origem .input-group > select.form-control {
        flex: 1 1 auto !important;
        width: 0 !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-origem .input-group > :not(select) {
        flex: 0 0 auto !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-hidden {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-origem-section-hidden {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-row {
        display: flex !important;
        flex-wrap: wrap !important;
        width: 100% !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-col {
        display: block !important;
        flex: 0 0 100% !important;
        max-width: 100% !important;
        width: 100% !important;
        padding-left: 5px !important;
        padding-right: 5px !important;
        box-sizing: border-box !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-col .input-group {
        width: calc(100% + 10px) !important;
        max-width: calc(100% + 10px) !important;
        box-sizing: border-box !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-original-hidden {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-textarea {
        display: block !important;
        width: calc(100% + 10px) !important;
        max-width: calc(100% + 10px) !important;
        height: 95px !important;
        min-height: 95px !important;
        resize: vertical !important;
        overflow-y: auto !important;
        white-space: pre-wrap !important;
        overflow-wrap: break-word !important;
        word-break: break-word !important;
        line-height: 1.35 !important;
        padding-top: 6px !important;
        padding-bottom: 6px !important;
        box-sizing: border-box !important;
        font: inherit !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-aux-col {
        display: block !important;
        flex: 0 0 min(353.78px, 100%) !important;
        max-width: min(353.78px, 100%) !important;
        width: min(353.78px, 100%) !important;
        margin-top: 4px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-aux-col .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        width: min(353.78px, 100%) !important;
        max-width: min(353.78px, 100%) !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-aux-col .input-group-prepend {
        display: flex !important;
        flex: 0 0 auto !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-observacao-aux-col select {
        flex: 1 1 auto !important;
        width: auto !important;
        min-width: 0 !important;
      }

      #cadastroModal.tm-paciente-layout div.mt-3.mb-5 {
        height: auto !important;
        min-height: 0 !important;
        max-height: none !important;
        flex-grow: 0 !important;
        padding-bottom: 0 !important;
        margin-bottom: 16px !important;
      }

      #cadastroModal.tm-paciente-layout div.mt-3.mb-5 > br {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card,
      #cadastroModal.tm-paciente-layout .tm-paciente-header-card * {
        font-family: inherit !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        font-style: normal !important;
        line-height: 1.4 !important;
        letter-spacing: normal !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card {
        position: relative !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-title {
        margin-bottom: 6px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-procedure-emoji {
        margin-right: 5px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-ocupar {
        position: absolute !important;
        right: 12px !important;
        bottom: 10px !important;
        z-index: 2;
        margin: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-info-wrap {
        display: flex !important;
        flex-direction: column !important;
        align-items: flex-start !important;
        justify-content: flex-start !important;
        gap: 4px !important;
        width: 100% !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-left {
        display: contents !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-row {
        display: block !important;
        width: 100% !important;
        margin-right: 0 !important;
        margin-bottom: 0 !important;
        white-space: normal !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-profissional {
        order: 2 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-convenio {
        order: 3 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-unidade {
        order: 4 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-data {
        order: 5 !important;
        display: block !important;
        width: 100% !important;
        margin-top: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-date-line,
      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-time-line {
        display: block !important;
        width: 100% !important;
        margin-left: 0 !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-time-line {
        margin-top: 2px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-native-icon-hidden {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-emoji {
        display: inline-block !important;
        width: 1.5em !important;
        margin-right: 4px !important;
        vertical-align: baseline !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card .tm-paciente-header-sala {
        font-size: 13px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-card blockquote {
        margin-top: 6px !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-convenio-externo-oculto {
        display: none !important;
      }

      #cadastroModal.tm-paciente-layout .tm-paciente-header-convenio-injetado {
        display: block !important;
      }

      @media (max-width: 720px) {
        #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid {
          grid-template-columns: minmax(0, 1fr) !important;
        }
        #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid .tm-paciente-field,
        #cadastroModal.tm-paciente-layout .tm-paciente-dados-grid .tm-paciente-observacao-row {
          grid-column: 1 / -1 !important;
          grid-row: auto !important;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function visibleModal() {
    const modal = document.querySelector('#cadastroModal');
    if (!modal) return null;

    const style = getComputedStyle(modal);
    const rect = modal.getBoundingClientRect();

    if (style.display === 'none' || style.visibility === 'hidden' || rect.width <= 0 || rect.height <= 0) return null;

    return modal;
  }

  function fieldByLabel(modal, labelText) {
    const labels = Array.from(modal.querySelectorAll('small.form-text.text-muted'));
    const allowedLabels = String(labelText || '')
      .split('|')
      .map((item) => norm(item))
      .filter(Boolean);

    for (const label of labels) {
      const currentLabel = norm(label.innerText || label.textContent || '');
      if (!allowedLabels.includes(currentLabel)) continue;

      const col = label.closest('.col');
      if (col && modal.contains(col)) return col;
    }

    return null;
  }

  function patientFieldProblems(modal) {
    const definitions = [
      ['nome', 'Nome do Paciente|Nome', 'input:not([type="hidden"])', true],
      ['nascimento', 'Data de Nascimento', 'input:not([type="hidden"])', true],
      ['sexo', 'Sexo', 'select', true],
      ['celular', 'Celular', 'input:not([type="hidden"])', true],
      ['email', 'e-mail', 'input:not([type="hidden"])', false],
      ['carteira', 'No. da Carteira do Plano', 'input:not([type="hidden"])', false],
      ['validade', 'Validade da Carteira', 'input:not([type="hidden"])', false],
      ['origem', 'Origem de Pacientes|Origem do Agendamento', 'select', true],
      ['cpf', 'CPF', 'input:not([type="hidden"])', false]
    ];
    return definitions.map(([key, label, selector, requiredByFlow]) => {
      const field = fieldByLabel(modal, label);
      const control = field?.querySelector(selector) || null;
      const value = norm(control?.value);
      const selectedText = norm(control?.selectedOptions?.[0]?.textContent);
      const missing = (requiredByFlow || control?.required) &&
        (!control || !value || (control.tagName === 'SELECT' && /^Selecione/i.test(selectedText)));
      const digits = key === 'celular' ? value.replace(/\D/g, '') : '';
      const malformed = !!control && !!value && (control.validity?.valid === false ||
        (key === 'celular' && (digits.length < 10 || digits.length > 11 || /^(\d)\1+$/.test(digits))));
      return { key, field, control, missing, malformed };
    });
  }

  function patientSetWarning(control, invalid) {
    if (!control?.parentElement) return;
    const host = control.parentElement;
    const hasNativeWarning = !!host.querySelector(':scope > .input-group-prepend > .input-group-text.invalid');
    const showCustomWarning = invalid && !hasNativeWarning;
    let warning = host.querySelector(':scope > .tm-paciente-required-warning');
    if (!warning && showCustomWarning) {
      host.classList.add('tm-paciente-warning-host');
      warning = document.createElement('span');
      warning.className = 'tm-paciente-required-warning';
      warning.textContent = '!';
      warning.setAttribute('aria-hidden', 'true');
      host.appendChild(warning);
    }
    if (warning) {
      const hostRect = host.getBoundingClientRect();
      const controlRect = control.getBoundingClientRect();
      const top = `${controlRect.top - hostRect.top + 1}px`;
      const left = `${controlRect.left - hostRect.left + 1}px`;
      const height = `${Math.max(0, controlRect.height - 2)}px`;
      if (warning.style.top !== top) warning.style.top = top;
      if (warning.style.left !== left) warning.style.left = left;
      if (warning.style.height !== height) warning.style.height = height;
      warning.classList.toggle('tm-paciente-warning-visible', showCustomWarning);
    }
    control.classList.toggle('tm-paciente-warning-control', showCustomWarning);
  }

  function patientRefreshWarnings(modal) {
    if (!modal?.classList.contains('tm-paciente-layout') ||
        modal.dataset.tmPacienteValidationAttempted !== '1') return;
    const celular = patientFieldProblems(modal).find(({ key }) => key === 'celular');
    if (celular) patientSetWarning(celular.control, celular.missing || celular.malformed);
  }

  function patientBookingComponent(modal) {
    const patientLink = Array.from(document.querySelectorAll('a'))
      .find((link) => norm(link.textContent) === 'Paciente');
    for (const start of [modal, patientLink]) {
      for (let element = start; element; element = element.parentElement) {
        const vue = element.__vue__;
        if (vue?.$route?.path === '/call-center' && typeof vue.$toast?.add === 'function') return vue;
      }
    }
    return null;
  }

  function patientNativeOrigem(modal) {
    const discardFirstVisitWarning = (field) => {
      field?.querySelectorAll('.tm-cad-required-warning').forEach((warning) => warning.remove());
      field?.querySelectorAll('.tm-cad-warning-host').forEach((host) => host.classList.remove('tm-cad-warning-host'));
      field?.querySelectorAll('.tm-cad-warning-control').forEach((control) => control.classList.remove('tm-cad-warning-control'));
      return field;
    };
    const visible = fieldByLabel(modal, 'Origem de Pacientes|Origem do Agendamento');
    if (visible) return discardFirstVisitWarning(visible);

    // A Primeira Vez da versão anterior podia deixar o componente Vue ligado
    // a uma linha removida. Recupere somente o campo nativo, sem recriá-lo.
    const root = patientBookingComponent(modal);
    const pending = root ? [root] : [];
    while (pending.length) {
      const component = pending.pop();
      if (norm(component?.label) === 'Origem do Agendamento') {
        const field = component.$el?.closest('.col');
        const ownerRow = component.$parent?.$el?.querySelector('.form-row');
        if (field && ownerRow?.isConnected && !field.isConnected) {
          ownerRow.appendChild(field);
        }
        return field?.isConnected ? discardFirstVisitWarning(field) : null;
      }
      pending.push(...(component?.$children || []));
    }
    return null;
  }

  function patientShowCpf(modal, dados) {
    const digits = String(patientBookingComponent(modal)?.dados?.paciente?.cadastro?.st_cpf || '')
      .replace(/\D/g, '');
    let field = dados.querySelector(':scope > .tm-paciente-cpf');
    if (digits.length !== 11) {
      field?.remove();
      return;
    }
    if (!field) {
      field = document.createElement('div');
      field.className = 'col col-12 tm-paciente-field tm-paciente-cpf';
      const label = document.createElement('small');
      label.className = 'form-text text-muted';
      label.textContent = 'CPF';
      const input = document.createElement('input');
      input.className = 'form form-control';
      input.type = 'text';
      input.readOnly = true;
      input.setAttribute('aria-label', 'CPF do paciente cadastrado');
      field.append(label, input);
      dados.appendChild(field);
    }
    const formatted = `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
    const input = field.querySelector('input');
    if (input && input.value !== formatted) input.value = formatted;
  }

  function patientMatchCpfHeight(dados, referenceField) {
    const reference = referenceField?.querySelector('input.form-control');
    const cpf = dados.querySelector(':scope > .tm-paciente-cpf input');
    const height = reference?.getBoundingClientRect().height;
    if (!cpf || !height) return;
    const pixels = `${height}px`;
    for (const property of ['height', 'min-height', 'max-height']) {
      if (cpf.style.getPropertyValue(property) !== pixels) {
        cpf.style.setProperty(property, pixels, 'important');
      }
    }
  }

  function patientValidateCellular(modal, event) {
    if (!modal || !isPacienteModal(modal)) return true;
    modal.dataset.tmPacienteValidationAttempted = '1';
    patientRefreshWarnings(modal);
    const celular = patientFieldProblems(modal).find(({ key }) => key === 'celular');
    if (!celular || (!celular.missing && !celular.malformed)) return true;

    event.preventDefault();
    event.stopImmediatePropagation();
    const detail = celular.missing ? 'O campo celular é obrigatório.' : 'Informe um celular válido.';
    const component = patientBookingComponent(modal);
    component?.$toast?.add({ severity: 'error', summary: 'Atenção', detail, life: 5000 });
    if (!component) console.warn('[TM] Balão do Klingo indisponível para validar o celular.');
    celular.control?.focus();
    return false;
  }

  function isPacienteModal(modal) {
    if (!modal || modal.id !== 'cadastroModal') return false;

    const text = modal.innerText || modal.textContent || '';
    const hasEditar = /Editar Marcação|Reenviar e-mail da marcação/i.test(text);
    const hasRemarcacao = /Remarcação de/i.test(text);
    const hasPatientName = fieldByLabel(modal, 'Nome do Paciente') ||
      (modal.classList.contains('tm-paciente-layout') && fieldByLabel(modal, 'Nome'));

    if (hasEditar || hasRemarcacao) return false;

    return (
      !!hasPatientName &&
      !!fieldByLabel(modal, 'Data de Nascimento') &&
      !!fieldByLabel(modal, 'Celular') &&
      !!fieldByLabel(modal, 'e-mail') &&
      !!fieldByLabel(modal, 'No. da Carteira do Plano') &&
      !!fieldByLabel(modal, 'Validade da Carteira')
    );
  }

  function addField(field, className) {
    if (!field) return;

    field.classList.add('tm-paciente-field', className);
    field.classList.remove(
      'col-md-1', 'col-md-2', 'col-md-3', 'col-md-4', 'col-md-5', 'col-md-6',
      'col-md-7', 'col-md-8', 'col-md-9', 'col-md-10', 'col-md-11', 'col-md-12'
    );
    field.classList.add('col', 'col-12');
  }

  function findDadosContainer(modal) {
    const nome = fieldByLabel(modal, 'Nome do Paciente|Nome');
    const mt3 = nome?.closest('.mt-3');
    return mt3 || nome?.parentElement?.parentElement || null;
  }

  function ensurePersonalDataHeader(dados) {
    if (dados.querySelector(':scope > .tm-paciente-dados-heading')) return;
    const header = document.createElement('div');
    header.className = 'border-bottom mb-1 d-flex justify-content-between hover-title-bg text-primary tm-paciente-dados-heading';
    const title = document.createElement('div');
    const small = document.createElement('small');
    small.textContent = 'Dados Pessoais';
    title.appendChild(small);
    header.append(title, document.createElement('div'));
    dados.insertBefore(header, dados.firstChild);
  }

  function renamePatientName(field) {
    const label = Array.from(field?.querySelectorAll('small.form-text.text-muted') || [])
      .find((small) => norm(small.textContent) === 'Nome do Paciente');
    if (label) label.textContent = 'Nome';
  }

  function moveOrigem(modal, dados) {
    const origem = patientNativeOrigem(modal);
    if (!origem || !dados) return;

    let row = dados.querySelector(':scope > .tm-paciente-origem-inline-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'form-row tm-paciente-origem-inline-row';
      dados.appendChild(row);
    }

    if (origem.parentElement !== row) row.appendChild(origem);

    addField(origem, 'tm-paciente-origem');
  }

  function hideOrigemSection(modal) {
    Array.from(modal.querySelectorAll('small')).forEach((small) => {
      if (!['ORIGEM DE PACIENTES', 'ORIGEM DO AGENDAMENTO'].includes(norm(small.innerText || small.textContent || '').toUpperCase())) return;
      const title = small.closest('.border-bottom.hover-title-bg');
      if (title && !title.querySelector('select, input')) {
        title.classList.add('tm-paciente-origem-section-hidden');
      }
    });
  }

  function findObservacaoRow(modal) {
    const obsHeaders = Array.from(modal.querySelectorAll('small')).filter((small) => {
      return norm(small.innerText || small.textContent || '') === 'Observação';
    });

    for (const obsHeader of obsHeaders) {
      let headerBlock = obsHeader.closest('.border-bottom, .hover-title-bg');
      if (!headerBlock) headerBlock = obsHeader.closest('div');
      if (!headerBlock) continue;

      let node = headerBlock.nextElementSibling;

      for (let i = 0; node && i < 10; i += 1, node = node.nextElementSibling) {
        if (!(node instanceof HTMLElement)) continue;
        if (!node.classList.contains('form-row')) continue;

        const cols = Array.from(node.children).filter((child) => child instanceof HTMLElement && child.classList.contains('col'));
        const obsCol = cols.find((col) => !!col.querySelector('input.form-control, input.form-control') && !col.querySelector('select'));
        const auxCol = cols.find((col) => !!col.querySelector('select.form-control, select.form-control') && !!col.querySelector('.fa-question'));

        if (obsCol && auxCol) return { row: node, obsCol, auxCol };
      }
    }

    return null;
  }


  function setupObservacao(modal) {
    const found = findObservacaoRow(modal);
    if (!found) return;

    const { row, obsCol, auxCol } = found;

    row.classList.add('tm-paciente-observacao-row');
    obsCol.classList.add('tm-paciente-observacao-col');
    auxCol.classList.add('tm-paciente-observacao-aux-col');

    row.style.setProperty('display', 'flex', 'important');
    row.style.setProperty('flex-wrap', 'wrap', 'important');
    obsCol.style.setProperty('flex', '0 0 100%', 'important');
    obsCol.style.setProperty('max-width', '100%', 'important');
    obsCol.style.setProperty('width', '100%', 'important');
    auxCol.style.setProperty('flex', '0 0 min(353.78px, 100%)', 'important');
    auxCol.style.setProperty('max-width', 'min(353.78px, 100%)', 'important');
    auxCol.style.setProperty('width', 'min(353.78px, 100%)', 'important');
    auxCol.style.setProperty('margin-top', '4px', 'important');

    const inputGroup = obsCol.querySelector('.input-group');
    const input = obsCol.querySelector('input.form-control, input');

    if (!inputGroup || !input) return;

    input.classList.add('tm-paciente-observacao-original-hidden');
    input.style.setProperty('display', 'none', 'important');

    let textarea = inputGroup.querySelector('textarea.tm-paciente-observacao-textarea');

    if (!textarea) {
      textarea = document.createElement('textarea');
      textarea.className = 'form form-control tm-paciente-observacao-textarea';
      textarea.value = input.value || '';

      textarea.addEventListener('input', () => {
        input.value = textarea.value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      });

      inputGroup.appendChild(textarea);
    }

    if (document.activeElement !== textarea && textarea.value !== input.value) {
      textarea.value = input.value || '';
    }

    textarea.style.setProperty('height', '95px', 'important');
    textarea.style.setProperty('min-height', '95px', 'important');
    textarea.style.setProperty('white-space', 'pre-wrap', 'important');
    textarea.style.setProperty('overflow-wrap', 'break-word', 'important');
    textarea.style.setProperty('word-break', 'break-word', 'important');
  }

  function monthName(monthShort) {
    const map = {
      jan: 'Janeiro', fev: 'Fevereiro', mar: 'Março', abr: 'Abril',
      mai: 'Maio', jun: 'Junho', jul: 'Julho', ago: 'Agosto',
      set: 'Setembro', out: 'Outubro', nov: 'Novembro', dez: 'Dezembro'
    };

    return map[String(monthShort || '').trim().toLowerCase()] || monthShort;
  }

  function weekdayName(dayShort) {
    const map = {
      dom: 'Domingo', seg: 'Segunda-feira', ter: 'Terça-feira',
      qua: 'Quarta-feira', qui: 'Quinta-feira', sex: 'Sexta-feira',
      sab: 'Sábado', sáb: 'Sábado'
    };

    return map[String(dayShort || '').trim().toLowerCase()] || dayShort;
  }

  function normalizeHeaderDate(dateBlock) {
    const calendarSmall = Array.from(dateBlock.querySelectorAll('small')).find((small) => !!small.querySelector('.fa-calendar-alt'));
    if (!calendarSmall) return;

    const rawText = norm(calendarSmall.textContent || '');
    const badge = calendarSmall.querySelector('.badge');
    const dayMatch = rawText.match(/(\d{1,2})\s*\/\s*([A-Za-zÀ-ÿ]{3})/i);
    if (!dayMatch) return;

    const icon = calendarSmall.querySelector('i');
    const dateText = `${parseInt(dayMatch[1], 10)} de ${monthName(dayMatch[2])} | ${weekdayName(badge?.textContent || '')}`.toUpperCase();

    calendarSmall.textContent = '';

    if (icon) {
      icon.style.setProperty('width', '1.25em', 'important');
      icon.style.setProperty('min-width', '1.25em', 'important');
      icon.style.setProperty('max-width', '1.25em', 'important');
      icon.style.setProperty('text-align', 'center', 'important');
      icon.style.setProperty('margin-right', '6px', 'important');
      calendarSmall.appendChild(icon);
    }

    calendarSmall.appendChild(document.createTextNode(dateText));
  }

  function addProcedureEmoji(title) {
    if (!title || title.querySelector(':scope > .tm-paciente-header-procedure-emoji')) return;
    const icon = document.createElement('span');
    icon.className = 'tm-paciente-header-procedure-emoji';
    icon.textContent = '🩺';
    icon.setAttribute('aria-hidden', 'true');
    title.prepend(icon);
  }

  function emojifyHeaderIcon(container, selector, emoji) {
    const icon = container?.querySelector(selector);
    if (!icon) return;
    icon.classList.add('tm-paciente-native-icon-hidden');
    if (icon.previousElementSibling?.classList.contains('tm-paciente-header-emoji')) {
      icon.previousElementSibling.textContent = emoji;
      return;
    }
    const replacement = document.createElement('span');
    replacement.className = 'tm-paciente-header-emoji';
    replacement.textContent = emoji;
    replacement.setAttribute('aria-hidden', 'true');
    icon.before(replacement);
  }

  function decorateHeader(profissional, convenio, unidade, dateBlock) {
    emojifyHeaderIcon(profissional, '.fa-user-md', '👨‍⚕️');
    emojifyHeaderIcon(convenio, '.fa-credit-card', '💳');
    emojifyHeaderIcon(unidade, '.fa-building', '🏥');
    const dateSmall = Array.from(dateBlock.querySelectorAll('small'))
      .find((small) => !!small.querySelector('.fa-calendar-alt'));
    const timeSmall = Array.from(dateBlock.querySelectorAll('small'))
      .find((small) => small !== dateSmall && /\d{1,2}:\d{2}/.test(small.textContent || ''));
    dateSmall?.classList.add('tm-paciente-header-date-line');
    timeSmall?.classList.add('tm-paciente-header-time-line');
    emojifyHeaderIcon(dateSmall, '.fa-calendar-alt', '📅');
    emojifyHeaderIcon(timeSmall, 'i', '🕒');
  }

  function positionOcuparButton(item) {
    const button = Array.from(item.querySelectorAll('button'))
      .find((candidate) => /^Ocupar\b/i.test(norm(candidate.textContent)));
    if (!button) return;
    const group = button.closest('.btn-group, .dropdown');
    const target = group && item.contains(group) ? group : button;
    target.classList.add('tm-paciente-header-ocupar');
  }

  function getExternalConvenioForHeaderList(listGroup) {
    if (!listGroup) return '';

    const convenioItem = Array.from(listGroup.children).find((item) => {
      if (!(item instanceof HTMLElement)) return false;
      if (!item.matches('li.list-group-item')) return false;
      if (item.querySelector('label .h4')) return false;
      return !!item.querySelector('.fa-credit-card');
    });

    const small = convenioItem?.querySelector('small.lead, small');
    const textValue = norm(small?.innerText || small?.textContent || '');

    if (textValue && convenioItem) {
      convenioItem.classList.add('tm-paciente-convenio-externo-oculto');
      convenioItem.style.setProperty('display', 'none', 'important');
    }

    return textValue;
  }

  function buildConvenioRowFromText(textValue) {
    const row = document.createElement('span');
    row.className = 'mr-3 tm-paciente-header-row tm-paciente-header-convenio tm-paciente-header-convenio-injetado';
    row.dataset.tmInjected = '1';

    const small = document.createElement('small');
    small.className = 'lead';

    const icon = document.createElement('i');
    icon.className = 'far fa-credit-card fa-fw mr-1';
    icon.setAttribute('aria-hidden', 'true');

    small.appendChild(icon);
    small.appendChild(document.createTextNode(` ${textValue} `));
    row.appendChild(small);

    return row;
  }

  function applyHeader(modal) {
    const listGroups = Array.from(modal.querySelectorAll('ul.list-group'));

    let totalHeaders = 0;

    listGroups.forEach((listGroup) => {
      const externalConvenioText = getExternalConvenioForHeaderList(listGroup);

      const items = Array.from(listGroup.children).filter((item) => {
        return (
          item instanceof HTMLElement &&
          item.matches('li.list-group-item') &&
          !!item.querySelector('label .h4') &&
          !!item.querySelector('label .fa-user-md') &&
          !!item.querySelector('label .fa-building') &&
          !!item.querySelector('label .fa-calendar-alt')
        );
      });

      totalHeaders += items.length;

      items.forEach((item) => {
        const title = item.querySelector('label .h4');
        const infoWrap = item.querySelector('label .d-flex.justify-content-between');
        const left = infoWrap?.querySelector(':scope > div:first-child');
        const dateBlock = infoWrap?.querySelector(':scope > div.lead, :scope > div:not(:first-child)');

        if (!title || !infoWrap || !left || !dateBlock) return;

        const injectedConvenio = left.querySelector('.tm-paciente-header-convenio-injetado');
        if (injectedConvenio && norm(injectedConvenio.textContent) !== externalConvenioText) {
          injectedConvenio.remove();
        }

        const spans = Array.from(left.querySelectorAll(':scope > span'));
        let convenio = spans.find((span) => !!span.querySelector('.fa-credit-card'));
        const profissional = spans.find((span) => !!span.querySelector('.fa-user-md'));
        const unidade = spans.find((span) => !!span.querySelector('.fa-building'));

        if (!profissional || !unidade) return;

        if (!convenio && externalConvenioText) {
          convenio = buildConvenioRowFromText(externalConvenioText);
          left.insertBefore(convenio, profissional);
        }

        item.classList.add('tm-paciente-header-card');
        positionOcuparButton(item);
        title.classList.add('tm-paciente-header-title');
        addProcedureEmoji(title);
        infoWrap.classList.add('tm-paciente-header-info-wrap');
        left.classList.add('tm-paciente-header-left');

        profissional.classList.add('tm-paciente-header-row', 'tm-paciente-header-profissional');
        convenio?.classList.add('tm-paciente-header-row', 'tm-paciente-header-convenio');
        unidade.classList.add('tm-paciente-header-row', 'tm-paciente-header-unidade');
        dateBlock.classList.add('tm-paciente-header-data');

        unidade.querySelectorAll('small.text-muted').forEach((small) => {
          small.classList.add('tm-paciente-header-sala');
        });

        normalizeHeaderDate(dateBlock);
        decorateHeader(profissional, convenio, unidade, dateBlock);
      });
    });

    modal.classList.toggle('tm-paciente-multiple-headers', totalHeaders > 1);
  }


  function parseDate(rawValue) {
    return tmParseDateInput(rawValue);
  }
  function enableDatePaste(field) {
    if (!field || field.dataset.tmPacienteDatePaste === '1') return;

    const input = field.querySelector('input[type="date"]');
    if (!input) return;

    field.dataset.tmPacienteDatePaste = '1';

    input.addEventListener('paste', (event) => {
      const parsed = parseDate(event.clipboardData?.getData('text/plain') || '');
      if (!parsed) return;

      event.preventDefault();
      input.value = parsed;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, true);
  }

  function protectBirthDate(field) {
    const input = field?.querySelector('input[type="date"]');
    if (!input || input.dataset.tmPacienteBirthDateGuard === '1') return;
    input.dataset.tmPacienteBirthDateGuard = '1';
    let lastValue = input.value;
    let yearDigits = 0;
    let yearActive = false;
    let replacement = '';
    let writing = false;
    const parts = (value) => /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    const reset = () => {
      lastValue = input.value;
      yearDigits = 0;
      yearActive = false;
      replacement = '';
    };
    input.addEventListener('pointerdown', reset, true);
    input.addEventListener('focus', reset, true);
    input.addEventListener('keydown', (event) => {
      if (/^(?:Arrow|Backspace|Delete|Tab|Home|End)/.test(event.key)) {
        reset();
        return;
      }
      if (!/^\d$/.test(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
      const current = parts(input.value);
      if (!current || (!replacement && (!yearActive || yearDigits < 4))) return;

      event.preventDefault();
      replacement = replacement.length === 4 ? event.key : replacement + event.key;
      const year = replacement.padStart(4, '0');
      if (Number(year) === 0) return;
      const next = `${year}-${current[2]}-${current[3]}`;
      if (input.value !== next) {
        writing = true;
        input.value = next;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        writing = false;
      }
      lastValue = input.value;
      yearActive = true;
      yearDigits = replacement.length;
    }, true);
    input.addEventListener('input', () => {
      if (writing) return;
      const before = parts(lastValue);
      const after = parts(input.value);
      if (after && (!before || before[1] !== after[1]) &&
          (!before || (before[2] === after[2] && before[3] === after[3]))) {
        yearActive = true;
        yearDigits = Math.min(4, yearDigits + 1);
      } else if (!after || (before && (before[2] !== after[2] || before[3] !== after[3]))) {
        yearActive = false;
        yearDigits = 0;
        replacement = '';
      }
      lastValue = input.value;
    }, true);
  }

  function patientLockIdentity(field) {
    const input = field?.querySelector('input');
    if (!input) return;
    if (!input.readOnly) input.readOnly = true;
    if (input.getAttribute('aria-readonly') !== 'true') {
      input.setAttribute('aria-readonly', 'true');
    }
  }

  function patientProfileButton(modal, nameField) {
    const inputGroup = nameField?.querySelector('.input-group');
    if (!inputGroup) return;
    const component = patientBookingComponent(modal);
    const patient = component?.dados?.paciente;
    const existing = Number(patient?.id_pessoa) > 0 && typeof component?.$root?.perfil === 'function';
    const current = inputGroup.querySelector(':scope > .tm-paciente-perfil-append');
    if (!existing) {
      current?.remove();
      return;
    }
    if (current) return;

    const append = document.createElement('div');
    append.className = 'input-group-append tm-paciente-perfil-append';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline-primary tm-paciente-perfil-button';
    button.title = 'Abrir perfil do paciente';
    button.setAttribute('aria-label', 'Abrir perfil do paciente');
    const icon = document.createElement('i');
    icon.className = 'fas fa-id-badge';
    icon.setAttribute('aria-hidden', 'true');
    button.appendChild(icon);
    button.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      patientOpenProfile(modal, nameField);
    });
    append.appendChild(button);
    inputGroup.appendChild(append);
  }

  function patientOpenProfile(modal, nameField) {
    const component = patientBookingComponent(modal);
    const patient = component?.dados?.paciente;
    if (!(Number(patient?.id_pessoa) > 0)) return false;
    const native = nameField?.querySelector('.form-group')?.__vue__?.$parent;
    if (typeof native?.perfil === 'function' && Number(native?.dados?.paciente?.id_pessoa) === Number(patient.id_pessoa)) {
      native.perfil();
      return true;
    }
    if (typeof component?.$root?.perfil !== 'function') return false;
    const jq = window.jQuery || window.$;
    if (typeof jq?.fn?.modal === 'function') jq('.modal').modal('hide');
    component.$root.perfil(patient);
    return true;
  }

  function applyPacienteLayout() {
    const modal = visibleModal();
    if (!modal) {
      clearPacienteLayout(document.querySelector('#cadastroModal'));
      return;
    }

    if (!isPacienteModal(modal)) {
      clearPacienteLayout(modal);
      return;
    }

    // O mesmo nó de modal é reutilizado após identificar um CPF. Aguarde a
    // limpeza do layout Primeira Vez para não capturar campos já reposicionados.
    if (modal.classList.contains('tm-primeira-vez-layout')) return;

    if (!modalBaselines.has(modal)) {
      const origemField = patientNativeOrigem(modal);
      const nameLabel = fieldByLabel(modal, 'Nome do Paciente')?.querySelector('small.form-text.text-muted');
      const emailInput = fieldByLabel(modal, 'e-mail')?.querySelector('input');
      const identity = ['Nome do Paciente|Nome', 'Data de Nascimento'].map((label) => {
        const input = fieldByLabel(modal, label)?.querySelector('input');
        return input ? { input, readOnly: input.readOnly, ariaReadOnly: input.getAttribute('aria-readonly') } : null;
      }).filter(Boolean);
      modalBaselines.set(modal, {
        attributes: tmCaptureAttributes(modal),
        headers: tmCaptureHeaderContents(modal),
        nameLabel: nameLabel ? { element: nameLabel, text: nameLabel.textContent } : null,
        emailInput,
        emailRequired: emailInput?.required,
        identity,
        origem: origemField ? {
          element: origemField,
          parent: origemField.parentNode,
          next: origemField.nextSibling
        } : null
      });
    }

    injectStyle();

    modal.classList.add('tm-paciente-layout');

    const dados = findDadosContainer(modal);
    if (!dados) return;

    dados.classList.add('tm-paciente-dados-grid');
    ensurePersonalDataHeader(dados);
    patientShowCpf(modal, dados);

    const nome = fieldByLabel(modal, 'Nome do Paciente|Nome');
    const nascimento = fieldByLabel(modal, 'Data de Nascimento');
    const celular = fieldByLabel(modal, 'Celular');
    const email = fieldByLabel(modal, 'e-mail');
    const sexo = fieldByLabel(modal, 'Sexo');
    const carteira = fieldByLabel(modal, 'No. da Carteira do Plano');
    const validade = fieldByLabel(modal, 'Validade da Carteira');
    const telefone = fieldByLabel(modal, 'Telefone');
    const nomeSocial = fieldByLabel(modal, 'Nome Social');

    addField(nome, 'tm-paciente-nome');
    renamePatientName(nome);
    patientProfileButton(modal, nome);
    addField(nascimento, 'tm-paciente-nascimento');
    patientLockIdentity(nome);
    patientLockIdentity(nascimento);
    addField(celular, 'tm-paciente-celular');
    addField(email, 'tm-paciente-email');
    const emailInput = email?.querySelector('input');
    if (emailInput) emailInput.required = false;
    addField(telefone, 'tm-paciente-telefone');
    addField(sexo, 'tm-paciente-sexo');
    addField(carteira, 'tm-paciente-carteira');
    addField(validade, 'tm-paciente-validade');

    nomeSocial?.classList.add('tm-paciente-hidden');

    moveOrigem(modal, dados);
    hideOrigemSection(modal);
    setupObservacao(modal);
    applyHeader(modal);

    [
      nome, nascimento, sexo, celular, email, telefone
    ].filter(Boolean).forEach((field) => {
      field.querySelectorAll('input, select, .input-group, .input-group-text').forEach((el) => {
        el.style.setProperty('height', '29.18px', 'important');
        el.style.setProperty('min-height', '29.18px', 'important');
        el.style.setProperty('max-height', '29.18px', 'important');
        el.style.setProperty('line-height', '1.2', 'important');
        el.style.setProperty('box-sizing', 'border-box', 'important');

        if (el.matches('input, select, .input-group-text')) {
          el.style.setProperty('padding-top', '3px', 'important');
          el.style.setProperty('padding-bottom', '3px', 'important');
        }
      });
    });

    patientMatchCpfHeight(dados, nome || nascimento);
    enableDatePaste(validade);
    patientRefreshWarnings(modal);
  }

  function clearPacienteLayout(modal) {
    if (!modal || modal.id !== 'cadastroModal') return;
    const baseline = modalBaselines.get(modal);
    if (!baseline) return;

    modal.querySelectorAll('.tm-paciente-header-emoji, .tm-paciente-header-procedure-emoji, .tm-paciente-header-convenio-injetado, textarea.tm-paciente-observacao-textarea, .tm-paciente-required-warning')
      .forEach((node) => node.remove());
    modal.querySelectorAll('.tm-paciente-warning-host').forEach((node) => node.classList.remove('tm-paciente-warning-host'));
    modal.querySelectorAll('.tm-paciente-warning-control').forEach((node) => node.classList.remove('tm-paciente-warning-control'));
    delete modal.dataset.tmPacienteValidationAttempted;
    modal.querySelectorAll('.tm-paciente-dados-heading').forEach((node) => node.remove());
    modal.querySelectorAll('.tm-paciente-perfil-append').forEach((node) => node.remove());
    modal.querySelectorAll('.tm-paciente-cpf').forEach((node) => node.remove());
    if (baseline.nameLabel?.element.isConnected) {
      baseline.nameLabel.element.textContent = baseline.nameLabel.text;
    }
    if (baseline.emailInput?.isConnected) baseline.emailInput.required = baseline.emailRequired;
    for (const { input, readOnly, ariaReadOnly } of baseline.identity || []) {
      if (!input.isConnected) continue;
      input.readOnly = readOnly;
      if (ariaReadOnly === null) input.removeAttribute('aria-readonly');
      else input.setAttribute('aria-readonly', ariaReadOnly);
    }

    const { origem } = baseline;
    if (origem?.element.isConnected && origem.parent.isConnected) {
      const next = origem.next?.parentNode === origem.parent ? origem.next : null;
      origem.parent.insertBefore(origem.element, next);
    }
    modal.querySelectorAll('.tm-paciente-origem-inline-row').forEach((row) => row.remove());

    tmRestoreAttributes(baseline.attributes);
    tmRestoreHeaderContents(baseline.headers);
    modal.classList.remove('tm-paciente-layout', 'tm-paciente-multiple-headers');
    modalBaselines.delete(modal);
  }
  document.addEventListener('shown.bs.modal', (event) => {
    if (event.target?.id === 'cadastroModal') {
      window.setTimeout(applyPacienteLayout, 0);
      window.setTimeout(applyPacienteLayout, 120);
    }
  }, true);

  document.addEventListener('hidden.bs.modal', (event) => {
    if (event.target?.id === 'cadastroModal') {
      clearPacienteLayout(event.target);
    }
  }, true);

  document.addEventListener('click', (event) => {
    if (!window.location.hash.startsWith('#/call-center')) return;
    const button = event.target?.closest?.('button');
    const modal = button?.closest?.('#cadastroModal.tm-paciente-layout');
    if (modal && /^Confirmar$/i.test(norm(button.textContent))) {
      patientValidateCellular(modal, event);
    }
  }, true);

  document.addEventListener('submit', (event) => {
    if (!window.location.hash.startsWith('#/call-center')) return;
    const modal = event.target?.closest?.('#cadastroModal.tm-paciente-layout');
    if (modal && !/^Reservar$/i.test(norm(event.submitter?.textContent))) {
      patientValidateCellular(modal, event);
    }
  }, true);

  for (const name of ['input', 'change']) {
    document.addEventListener(name, (event) => {
      const modal = event.target?.closest?.('#cadastroModal.tm-paciente-layout');
      if (modal?.dataset.tmPacienteValidationAttempted === '1' && event.target.matches('input, select')) {
        patientRefreshWarnings(modal);
      }
    }, true);
  }

  // Mesmo tratamento antecipado do cadastro de primeira vez, limitado ao
  // formulário de paciente já cadastrado ("Nome do Paciente").
  let observedPacienteModal = null;

  function applyPacienteBeforePaint() {
    const modal = observedPacienteModal;
    if (!modal?.isConnected || modal.classList.contains('tm-paciente-layout') ||
        modal.classList.contains('tm-primeira-vez-layout') ||
        visibleModal() !== modal || !isPacienteModal(modal)) return;
    applyPacienteLayout();
  }

  function observePacienteModal(modal) {
    if (modal === observedPacienteModal) return;
    observedPacienteModal = modal;
    if (!modal) return;

    applyPacienteBeforePaint();
  }

  tmBookingModalWatch.subscribe((modal) => {
    if (modal !== observedPacienteModal) observePacienteModal(modal);
    else if (modal?.classList.contains('tm-paciente-layout')) {
      patientRefreshWarnings(modal);
      if (!modal.querySelector('.tm-paciente-perfil-append')) {
        patientProfileButton(modal, fieldByLabel(modal, 'Nome do Paciente|Nome'));
      }
    }
    else applyPacienteBeforePaint();
  });

  tmRuntime.register('cadastro de paciente', applyPacienteLayout, ['#/call-center']);
})();

/* =========================
   CALL CENTER - TEXTO DE COPIAR RESUMO
========================= */
(function () {
  'use strict';

  const SEPARATOR = '----------------------------------';
  const UNIT_REFERENCES = {
    SAMEC: 'A clínica está localizada na rua do fórum regional de Bangu e ao lado da CIA do Médico.',
    BANGU: 'A clínica está localizada no prédio comercial Centro Profissional de Bangu, ao lado da casa lotérica e próximo ao ponto final do ônibus 864',
    BARRA: 'Unidade localizada próxima à concessionária Mercedes-Benz em frente ao Shopping Downtown | (Estação BRT - Bosque Marapendi)',
    COPACABANA: 'Unidade localizada ao lado da Brinka Brinquedos, entre a rua Bolivar e Barão de Ipanema, próximo ao antigo cinema Roxy | (Estação Metro - Canta Galo)'
  };

  function clean(value) {
    return String(value ?? '').trim();
  }

  function getSummaryComponent(button) {
    for (let node = button; node; node = node.parentElement) {
      const component = node.__vue__;
      if (component?.$options?.methods?.copiar_resumo && component.resumo) {
        return component;
      }
    }
    return null;
  }

  function formatAddress(address) {
    const street = clean(address?.st_logradouro);
    const number = clean(address?.st_numero);
    const complement = clean(address?.st_complemento);
    const cepDigits = clean(address?.in_cep).replace(/\D/g, '').padStart(8, '0');
    if (!street || !/^\d{8}$/.test(cepDigits)) return '';

    const parts = [street];
    if (number) parts.push(`No. ${number}`);
    if (complement) parts.push(complement);
    return `${parts.join(', ')} - CEP: ${cepDigits.slice(0, 5)}-${cepDigits.slice(5)}`;
  }

  function referenceForUnit(name) {
    const normalized = clean(name).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
    const unit = Object.keys(UNIT_REFERENCES).find(key =>
      new RegExp(`\\b${key}\\b`).test(normalized));
    return unit ? UNIT_REFERENCES[unit] : '';
  }

  function formatAppointment(item, component) {
    const procedure = clean(item?.procedimento?.search);
    const doctor = clean(item?.medico?.st_nome_exibicao);
    const dateTime = clean(item?.dt_inicio);
    const date = dateTime && component.$util?.getFormatDate?.(dateTime);
    const weekday = dateTime && component.$util?.getFormatDate?.(dateTime, 'dddd');
    const time = dateTime.slice(11, 16);
    if (!procedure || !date || !/^\d{2}:\d{2}$/.test(time) || !weekday) return '';

    return [
      `*️⃣ Procedimento: ${procedure}`,
      `🧑‍⚕️ Profissional: ${doctor}`,
      `📅 Data: ${date} ${time} - ${weekday}`
    ].join('\n');
  }

  function buildSummary(component) {
    const summary = component.resumo;
    const appointments = summary?.lista_resumo;
    const units = summary?.resumo_unidades;
    if (!Array.isArray(appointments) || !appointments.length || !Array.isArray(units)) return '';

    const unitsById = new Map(units
      .filter((unit) => unit?.id_unidade_operacao != null)
      .map((unit) => [String(unit.id_unidade_operacao), unit]));
    const groups = new Map();

    for (const item of appointments) {
      const unitId = item?.id_unidade_operacao ?? item?.unidade_operacao?.id_unidade_operacao;
      if (unitId == null) return '';
      const key = String(unitId);
      const unit = unitsById.get(key);
      const name = clean(unit?.st_nome || item?.unidade_operacao?.st_nome);
      const address = formatAddress(unit?.endereco);
      const appointment = formatAppointment(item, component);
      // Se a unidade não puder ser associada com segurança, manter a cópia nativa.
      if (!unit || !name || !address || !appointment) return '';

      if (!groups.has(key)) groups.set(key, { name, address, reference: referenceForUnit(name), appointments: [] });
      groups.get(key).appointments.push(appointment);
    }

    const patient = clean(summary.paciente?.st_nome || summary.cadastro_temporario?.st_nome) || '---';
    const oneUnit = groups.size === 1;
    const groupTexts = Array.from(groups.values(), (group) => {
      const appointmentsText = group.appointments.join(`\n${SEPARATOR}\n`);
      const unitText = `🏥 Unidade: ${group.name}\n📍 Endereço: ${group.address}` +
        (group.reference ? `\n🚏 Referência: ${group.reference}` : '');
      return `${appointmentsText}\n${oneUnit ? `${SEPARATOR}\n` : ''}${unitText}`;
    });

    return `Agendamento concluído ✅\n\n👤 Paciente: ${patient}\n${SEPARATOR}\n` +
      groupTexts.join(`\n${SEPARATOR}\n`);
  }

  document.addEventListener('click', (event) => {
    const button = event.target instanceof Element
      ? event.target.closest('a.btn.btn-secondary.btn-lg.ml-1')
      : null;
    if (!button || clean(button.textContent) !== 'Copiar Resumo') return;

    const component = getSummaryComponent(button);
    if (!component) return;
    const text = buildSummary(component);
    if (!text) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      component.copiar_texto(text, 'Resumo da marcação copiado!');
    } catch (error) {
      console.error('[TM] Falha ao copiar o resumo personalizado; tentando a cópia original.', error);
      component.copiar_resumo();
    }
  }, true);
})();

/* =========================
   CALL CENTER - FOCO E SUGESTÕES INICIAIS
========================= */
(function () {
  'use strict';

  const PLAN = 'input[placeholder="Operadora/Plano..."]';
  const STYLE_ID = 'tm-callcenter-initial-suggestions-style';
  const manuallyFocused = new WeakSet();
  let keyboardIntentUntil = 0;

  function isCallCenter() {
    return window.location.hash === '#/call-center';
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    // Estas listas são as sugestões fixas do formulário. O autocomplete
    // pesquisável fica dentro de .form-group e continua disponível.
    style.textContent = `
      .row:has(> .col > .form-group ${PLAN}) > .col > ul.list-group,
      .row:has(> .col > .form-group input[placeholder="Selecione o Procedimento..."]) > .col > ul.list-group {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('pointerdown', (event) => {
    if (!isCallCenter() || !(event.target instanceof Element)) return;
    const input = event.target.closest(PLAN);
    if (input) manuallyFocused.add(input);
  }, true);

  document.addEventListener('keydown', (event) => {
    if (isCallCenter() && event.key === 'Tab') keyboardIntentUntil = Date.now() + 500;
  }, true);

  document.addEventListener('focusin', (event) => {
    const input = event.target;
    if (!isCallCenter() || !(input instanceof Element) || !input.matches(PLAN)) return;
    if (Date.now() <= keyboardIntentUntil) manuallyFocused.add(input);
    if (!manuallyFocused.has(input)) input.blur();
  }, true);

  document.addEventListener('focusout', (event) => {
    if (event.target instanceof Element && event.target.matches(PLAN)) {
      manuallyFocused.delete(event.target);
    }
  }, true);

  tmRuntime.register('Call Center sem foco e sugestões iniciais', () => {
    if (!isCallCenter()) return;
    ensureStyle();
    const input = document.querySelector(PLAN);
    if (input && document.activeElement === input && !manuallyFocused.has(input)) input.blur();
  }, ['#/call-center']);
})();

/* =========================
   CALL CENTER - RASCUNHOS EM ESPERA
========================= */
(function () {
  'use strict';

  const DOCK_ID = 'tm-callcenter-drafts';
  const STYLE_ID = 'tm-callcenter-drafts-style';
  const MODAL_BUTTON_ID = 'tm-callcenter-draft-modal-save';
  const MAX_DRAFTS = 20;
  // Dados de pacientes ficam apenas na memória desta aba; não usar storage persistente.
  const drafts = [];
  const savedFields = ['dados', 'procedimentos', 'cadastro_temporario', 'st_observacoes',
    'campos_customizados_base', 'fl_tele_atendimento', 'sinalizador_atendimento',
    'extra', 'ordem_chegada', 'slots', 'confirm_docs', 'espera'];
  let nextId = 1;
  let owner = null;
  let open = false;
  let notice = '';
  let pendingResume = null;
  let restoring = false;
  let saving = false;
  let rendered = '';
  let lastRoute = '';
  let unloadGuardAttached = false;

  function confirmLeavingWithDrafts(event) {
    if (!drafts.length) return;
    event.preventDefault();
    // Compatibilidade com navegadores que ainda exigem returnValue.
    event.returnValue = true;
  }

  function syncUnloadGuard() {
    const shouldAttach = drafts.length > 0;
    if (shouldAttach === unloadGuardAttached) return;
    if (shouldAttach) window.addEventListener('beforeunload', confirmLeavingWithDrafts);
    else window.removeEventListener('beforeunload', confirmLeavingWithDrafts);
    unloadGuardAttached = shouldAttach;
  }

  function clone(value) {
    return JSON.parse(JSON.stringify(value, (key, item) => {
      if (key === '__ob__' || typeof item === 'function') return undefined;
      if (typeof File !== 'undefined' && item instanceof File) throw new Error('Anexos não podem ficar em espera.');
      if (typeof Blob !== 'undefined' && item instanceof Blob) throw new Error('Anexos não podem ficar em espera.');
      return item;
    }));
  }

  function component() {
    if (window.location.hash !== '#/call-center') return null;
    const input = document.querySelector('input[placeholder="Operadora/Plano..."]');
    const firstVisit = input || [...document.querySelectorAll('a')]
      .find((item) => item.textContent.trim() === 'Primeira Vez');
    // O formulário inicial some quando o usuário passa para horários. O modal
    // continua dentro da árvore do mesmo componente em todas as etapas.
    for (const start of [document.getElementById('cadastroModal'), firstVisit]) {
      for (let element = start; element; element = element.parentElement) {
        const vue = element.__vue__;
        if (vue?.$route?.path === '/call-center' &&
            typeof vue.$options?.methods?.marcar === 'function' &&
            typeof vue.startFluxo === 'function') return vue;
      }
    }
    return null;
  }

  function hasWork(vue) {
    return !!(vue?.dados?.paciente || vue?.dados?.plano || vue?.dados?.procedimento ||
      vue?.procedimentos?.length || vue?.cadastro_temporario?.st_nome || vue?.st_observacoes?.trim());
  }

  function safeFlow(vue) {
    return [1, 2].includes(vue?.fluxo) && !vue?.remarcacao && !vue?.orcamento &&
      !vue?.id_infusao && vue?.$route?.path === '/call-center';
  }

  function userId(vue) {
    return String(vue?.$store?.state?.user?.id_usuario || '');
  }

  function headerUserId() {
    for (let element = document.querySelector('nav.navbar'); element; element = element.parentElement) {
      const id = userId(element.__vue__);
      if (id) return id;
    }
    return '';
  }

  function checkOwner(vue) {
    const current = userId(vue) || headerUserId();
    if (!current) return false;
    if (owner && owner !== current) {
      drafts.length = 0;
      pendingResume = null;
      open = false;
      notice = '';
    }
    owner = current;
    return true;
  }

  function label(snapshot) {
    const data = snapshot.dados || {};
    const patient = data.paciente?.st_nome || snapshot.cadastro_temporario?.st_nome || '';
    const procedures = snapshot.procedimentos || [];
    const name = procedures.map((item) => item.procedimento?.search).filter(Boolean).slice(0, 2).join(' · ');
    const display = (value) => typeof value === 'string' ? value.trim() :
      ['search', 'st_nome_exibicao', 'st_nome', 'nome', 'nm_pessoa', 'descricao', 'st_descricao']
        .map((key) => value?.[key]).find((text) => typeof text === 'string' && text.trim())?.trim() || '';
    const professional = procedures.map((item) => display(item.medico || item.profissional))
      .find(Boolean) || display(data.medico || data.profissional);
    const operator = display(data.plano || data.operadora || procedures[0]?.plano);
    return { patient, procedure: name || data.procedimento?.search || '',
      professional, operator };
  }

  function displayDate(date) {
    const value = String(date || '');
    return /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value.slice(8, 10)}/${value.slice(5, 7)}/${value.slice(0, 4)}` : '';
  }

  function selectedTimes(snapshot) {
    return (snapshot.procedimentos || []).filter((item) => item.data && item.hora)
      .map((item) => {
        const date = displayDate(item.data);
        return date ? `${date} • ${item.hora}` : '';
      }).filter(Boolean).slice(0, 3);
  }

  function draftProcedureGroups(snapshot, slots = []) {
    const data = snapshot.dados || {};
    const procedures = snapshot.procedimentos?.length ? snapshot.procedimentos :
      (data.procedimento ? [data] : []);
    const display = (value) => typeof value === 'string' ? value.trim() :
      ['search', 'st_nome_exibicao', 'st_nome', 'nome', 'nm_pessoa', 'descricao', 'st_descricao']
        .map((key) => value?.[key]).find((text) => typeof text === 'string' && text.trim())?.trim() || '';
    return procedures.map((item, index) => {
      const slot = slots.find((entry) => entry.procedureIndex === index) ||
        (procedures.length === 1 ? slots[0] : null);
      const date = displayDate(item.data || slot?.date);
      const time = item.hora || slot?.time;
      return {
        procedure: display(item.procedimento),
        professional: display(item.medico || item.profissional ||
          (procedures.length === 1 ? data.medico || data.profissional : null)),
        dateTime: [date, time].filter(Boolean).join(' • ')
      };
    });
  }

  function slotPreference(source, fallbackIndex = null) {
    const date = String(source?.data || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !source?.hora) return null;
    return {
      date,
      time: String(source.hora),
      agendaId: Number(source.id_agenda) || null,
      procedureIndex: Number.isInteger(source.index) ? source.index : fallbackIndex,
      doctorId: Number(source.medico?.id_pessoa || source.id_medico) || null,
      procedureId: Number(source.procedimento?.id_procedimento) || null,
      unitId: Number(source.id_unidade_operacao || source.unidade_operacao?.id_unidade_operacao ||
        source.unidade?.id_unidade_operacao) || null
    };
  }

  function preferredSlots(vue) {
    const procedures = vue.procedimentos || [];
    const selected = procedures.map((item, index) =>
      slotPreference(item, procedures.length > 1 ? index : null)).filter(Boolean);
    if (selected.length) return selected;
    const fallback = slotPreference(vue.horario_selecionado);
    return fallback ? [fallback] : [];
  }

  function preferredSlot(vue) {
    const selected = preferredSlots(vue)[0];
    if (selected) return selected;
    const source = vue.horario_selecionado || null;
    const date = String(source?.data || Object.keys(vue.exibicao || {})[vue.selecao?.dia] || '');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
    return { date };
  }

  function capture(vue) {
    if (!safeFlow(vue) || !hasWork(vue)) throw new Error('Preencha ao menos paciente, plano ou procedimento.');
    if (vue.buscando || vue.buscando_paciente || vue.buscando_procedimento ||
        vue.$store?.state?.loading) throw new Error('Aguarde a busca em andamento terminar.');
    if ([...document.querySelectorAll('input[type="file"]')].some((input) => input.files?.length) ||
        vue.marcacao_anexo) {
      throw new Error('Anexos não podem ficar em espera.');
    }
    const values = Object.fromEntries(savedFields.map((field) => [field, vue[field]]));
    const snapshot = clone(values);
    if (JSON.stringify(snapshot).length > 250000) throw new Error('Este preenchimento é grande demais para ficar em espera.');
    return { flow: vue.fluxo, snapshot, preferred: preferredSlot(vue),
      preferredSlots: preferredSlots(vue) };
  }

  function clearTimes(snapshot) {
    // A seleção anterior pode ter criado uma reserva temporária no servidor; nunca a reutilizar.
    const copy = clone(snapshot);
    for (const item of copy.procedimentos || []) {
      for (const field of ['hora', 'data', 'hg', 'vg', 'base', 'id_agenda', 'slots',
        'duracao', 'local_nome', 'id_local', 'doc_pre_atends']) {
        if (field in item) item[field] = null;
      }
      if (item.repeticao && typeof item.repeticao === 'object') {
        item.repeticao.hora = null;
        if ('base' in item.repeticao) item.repeticao.base = null;
      }
      item.selected = true;
      item.novo = true;
    }
    for (const field of ['hora', 'data', 'id_agenda']) {
      if (field in (copy.dados || {})) copy.dados[field] = null;
    }
    if (copy.dados) {
      copy.dados.selected = false;
      if (copy.dados.repeticao && typeof copy.dados.repeticao === 'object') {
        copy.dados.repeticao.hora = null;
        if ('base' in copy.dados.repeticao) copy.dados.repeticao.base = null;
      }
    }
    return copy;
  }

  function notify(message) {
    notice = message;
    open = true;
    render();
  }

  function notifyUnavailable(vue, message) {
    if (typeof vue.$toast?.add === 'function') {
      try {
        vue.$toast.add({ severity: 'error', summary: 'Vaga indisponível',
          detail: message, life: 8000 });
        return;
      } catch (error) {
        console.warn('[TM] Não foi possível exibir o alerta de vaga indisponível.', error);
      }
    }
    notify(message);
  }

  async function save() {
    if (saving || restoring) return;
    const vue = component();
    if (!vue || !checkOwner(vue)) return notify('Abra uma marcação para colocá-la em espera.');
    if (drafts.length >= MAX_DRAFTS) return notify(`Limite de ${MAX_DRAFTS} rascunhos nesta aba.`);
    let captured;
    try { captured = capture(vue); }
    catch (error) { return notify(error.message); }
    saving = true;
    const description = label(captured.snapshot);
    drafts.unshift({ id: nextId++, user: owner, created: Date.now(), ...captured,
      ...description, times: selectedTimes(captured.snapshot),
      groups: draftProcedureGroups(captured.snapshot, captured.preferredSlots) });
    open = true;
    notice = '';
    render();
    try {
      const modal = document.querySelector('#cadastroModal.show');
      if (modal) {
        const jq = window.jQuery || window.$;
        if (jq?.fn?.modal) jq('#cadastroModal').modal('hide');
        else modal.querySelector('[data-dismiss="modal"]')?.click();
      }
      if (vue.horarios && vue.procedimentos?.some((item) => item.data && item.hora)) vue.voltar();
      await vue.reiniciar();
    }
    catch (error) {
      console.error('[TM] Rascunho salvo, mas não foi possível reiniciar a marcação.', error);
      notice = 'Rascunho salvo; reinicie a marcação manualmente para começar outra.';
    } finally {
      saving = false;
      render();
    }
  }

  async function fetchPatient(vue, snapshot) {
    const id = snapshot.dados?.paciente?.id_pessoa;
    if (!(Number(id) > 0)) return;
    const response = await vue.axios.post('/aql?a=pacientes.show', {
      q: [{ name: 'pacientes.show', id: 'paciente', parms: { id } }]
    });
    if (response?.data?.paciente?.status !== 200 || !response.data.paciente.data) {
      throw new Error('Não foi possível confirmar o cadastro do paciente.');
    }
    snapshot.dados.paciente = response.data.paciente.data;
  }

  async function waitForDefaultPlan(vue, flow) {
    const defaultId = flow === 1 ? Number(vue.$store?.state?.user?.id_plano) : 0;
    if (!(defaultId > 0)) return;
    for (let attempt = 0; attempt < 40; attempt++) {
      if (Number(vue.dados?.plano?.id_plano) === defaultId) return;
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    throw new Error('O plano padrão ainda não carregou. Aguarde e tente retomar novamente.');
  }

  function dayBefore(date) {
    const value = new Date(`${date}T12:00:00`);
    value.setDate(value.getDate() - 1);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  }

  async function waitForSearch(vue) {
    for (let attempt = 0; attempt < 150; attempt++) {
      if (!vue.buscando && Array.isArray(vue.horarios)) return;
      if (component() !== vue) throw new Error('A página mudou durante a busca.');
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    throw new Error('A busca de horários demorou demais. Use Buscar Horários para tentar novamente.');
  }

  function waitForModalShown(modal) {
    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        document.removeEventListener('shown.bs.modal', onShown, true);
        resolve();
      };
      const onShown = (event) => { if (event.target === modal) finish(); };
      document.addEventListener('shown.bs.modal', onShown, true);
      // O evento pode ter ocorrido antes do registro; nunca bloqueie a retomada.
      window.setTimeout(finish, 450);
    });
  }

  function matchingSlot(vue, preferred, used = new Set()) {
    return (vue.horarios || []).find((slot) =>
      !used.has(slot) &&
      slot.status === 'livre' && !slot.bloqueado && !slot.restricao &&
      Number.isInteger(slot.index) &&
      slot.data === preferred.date &&
      String(slot.hora) === preferred.time &&
      (preferred.procedureIndex === null || slot.index === preferred.procedureIndex) &&
      (!preferred.agendaId || Number(slot.id_agenda) === preferred.agendaId) &&
      (!preferred.doctorId || Number(slot.medico?.id_pessoa || slot.id_medico) === preferred.doctorId) &&
      (!preferred.procedureId || Number(slot.procedimento?.id_procedimento) === preferred.procedureId) &&
      (!preferred.unitId || Number(slot.id_unidade_operacao ||
        slot.unidade_operacao?.id_unidade_operacao || slot.unidade?.id_unidade_operacao) === preferred.unitId));
  }

  function unitName(value) {
    if (typeof value === 'string') return value.trim();
    return String(value?.st_nome || value?.search || '').trim();
  }

  function catalogUnit(vue, unitId) {
    if (!unitId) return '';
    for (const source of [vue.unidadesTodas, vue.unidadesSelecionadas]) {
      const units = Array.isArray(source) ? source : Array.isArray(source?.data) ? source.data : [];
      const unit = units.find((item) =>
        Number(item?.id_unidade_operacao ?? item?.id) === unitId);
      if (unitName(unit)) return unitName(unit);
    }
    return '';
  }

  function restoreSlotUnit(vue, target, saved, currentSlot) {
    if (!target || !currentSlot) return;
    const savedUnit = Number(saved?.id_unidade_operacao || saved?.unidade_operacao?.id_unidade_operacao ||
      saved?.unidade?.id_unidade_operacao);
    const currentUnit = Number(currentSlot.id_unidade_operacao ||
      currentSlot.unidade_operacao?.id_unidade_operacao || currentSlot.unidade?.id_unidade_operacao);
    const targetUnit = Number(target.id_unidade_operacao || target.unidade_operacao?.id_unidade_operacao ||
      target.unidade?.id_unidade_operacao);
    if (savedUnit && currentUnit && savedUnit !== currentUnit) return;
    if (savedUnit && targetUnit && savedUnit !== targetUnit) return;
    if (currentUnit && targetUnit && currentUnit !== targetUnit) return;
    if (saved?.id_local && currentSlot.id_local &&
        Number(saved.id_local) !== Number(currentSlot.id_local)) return;
    if (saved?.id_local && target.id_local && Number(saved.id_local) !== Number(target.id_local)) return;
    if (unitName(target.unidade)) return;
    const unitId = currentUnit || targetUnit || savedUnit;
    const name = unitName(saved?.unidade) || unitName(currentSlot.unidade) ||
      unitName(currentSlot.unidade_operacao) || catalogUnit(vue, unitId);
    if (name) target.unidade = name;
  }

  async function restoreDate(vue, preference, savedProcedures = []) {
    if (typeof vue.buscarHorarios !== 'function') return '';
    const preferences = Array.isArray(preference) ? preference : preference ? [preference] : [];
    const preferred = preferences[0];
    if (!preferred) {
      if (!vue.procedimentos?.length && !vue.dados?.procedimento) {
        return 'Preenchimento retomado. Adicione um procedimento para buscar horários.';
      }
      vue.buscarHorarios();
      await waitForSearch(vue);
      return 'Horários atualizados. Escolha uma data e uma vaga disponíveis.';
    }
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    if (preferences.some((item) => item.date < todayIso)) {
      return 'Uma das datas preferidas já passou. Escolha novas vagas.';
    }
    vue.buscadoAte = dayBefore(preferences.reduce((earliest, item) =>
      item.date < earliest ? item.date : earliest, preferred.date));
    vue.buscarHorarios();
    await waitForSearch(vue);
    // listaPacientes abre a agenda completa do dia, não o cadastro do paciente.
    // A vaga já está na busca; selecioná-la diretamente abre apenas o cadastro.
    if (preferences.some((item) => !item.time)) {
      return 'Horários atualizados. Escolha uma vaga disponível na lista.';
    }
    const used = new Set();
    const slots = preferences.map((item) => {
      const slot = matchingSlot(vue, item, used);
      if (slot) used.add(slot);
      return slot;
    });
    const missing = preferences.filter((item, index) => !slots[index]);
    if (missing.length) {
      const when = missing.slice(0, 2).map((item) =>
        `${displayDate(item.date)} • ${item.time}`).join(', ');
      const message = missing.length === 1 ?
        `A vaga de ${when} não está mais disponível. Escolha outro horário na lista.` :
        `${missing.length} vagas não estão mais disponíveis (${when}). Escolha outros horários na lista.`;
      return { unavailable: true, message };
    }
    for (const [index, slot] of slots.entries()) {
      if (component() !== vue) throw new Error('A página mudou durante a reserva das vagas.');
      const procedureIndex = preferences[index].procedureIndex ?? index;
      const savedProcedure = savedProcedures[procedureIndex];
      restoreSlotUnit(vue, slot, savedProcedure, slot);
      await vue.selecionar_horario(slot);
      await new Promise((resolve) => vue.$nextTick(resolve));
      restoreSlotUnit(vue, vue.procedimentos?.[procedureIndex], savedProcedure, slot);
    }
    for (let attempt = 0; attempt < 120; attempt++) {
      const modal = document.querySelector('#cadastroModal.show');
      if (modal) {
        // A abertura do modal ainda pode reconstruir `procedimentos` após a
        // seleção do horário. Reponha a unidade só depois dessa montagem.
        await waitForModalShown(modal);
        if (!document.querySelector('#cadastroModal.show') || component() !== vue) return '';
        await new Promise((resolve) => vue.$nextTick(resolve));
        for (const [index, slot] of slots.entries()) {
          const procedureIndex = preferences[index].procedureIndex ?? index;
          const selected = vue.procedimentos?.[procedureIndex];
          const preferredSlot = preferences[index];
          if (!selected || (preferredSlot.agendaId && selected.id_agenda &&
              Number(selected.id_agenda) !== preferredSlot.agendaId) ||
              (selected.data && selected.data !== preferredSlot.date) ||
              (selected.hora && String(selected.hora) !== preferredSlot.time)) continue;
          restoreSlotUnit(vue, selected, savedProcedures[procedureIndex], slot);
        }
        vue.$forceUpdate?.();
        return '';
      }
      if (component() !== vue) throw new Error('A página mudou durante a reserva da vaga.');
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }
    return { unavailable: true,
      message: 'Não foi possível reabrir as vagas. Elas podem ter sido ocupadas durante a retomada. Confira os horários exibidos.' };
  }

  async function resume(id) {
    const draft = drafts.find((item) => item.id === id);
    if (!draft || restoring || saving) return;
    const vue = component();
    if (!vue) {
      pendingResume = id;
      window.location.hash = '#/call-center';
      tmRuntime.schedule(0);
      return;
    }
    if (!checkOwner(vue) || draft.user !== owner) return notify('Este rascunho pertence a outra sessão.');
    if (hasWork(vue) && (safeFlow(vue) || vue.remarcacao || vue.orcamento || vue.id_infusao)) {
      return notify('Guarde ou reinicie a marcação atual antes de retomar outra.');
    }
    pendingResume = null;
    restoring = true;
    notify('Restaurando rascunho...');
    try {
      const snapshot = clearTimes(draft.snapshot);
      await fetchPatient(vue, snapshot);
      if (window.location.hash !== '#/call-center' || component() !== vue || userId(vue) !== draft.user) {
        throw new Error('A página mudou durante a restauração. Tente novamente.');
      }
      vue.startFluxo(draft.flow);
      await new Promise((resolve) => vue.$nextTick(resolve));
      await waitForDefaultPlan(vue, draft.flow);
      for (const field of savedFields) {
        if (Object.hasOwn(snapshot, field) && Object.hasOwn(vue.$data, field)) vue[field] = snapshot[field];
      }
      if (snapshot.dados?.plano && typeof vue.selecionarPlano === 'function') {
        vue.selecionarPlano(snapshot.dados.plano);
        if (!vue.dados.plano) throw new Error('O plano salvo não está mais disponível. Reinicie e escolha outro plano.');
      }
      vue.$forceUpdate();
      if (snapshot.dados?.paciente) await vue.selecionarPaciente(true);
      drafts.splice(drafts.indexOf(draft), 1);
      open = false;
      notice = '';
      try {
        const status = await restoreDate(vue,
          draft.preferredSlots?.length ? draft.preferredSlots : draft.preferred,
          draft.snapshot.procedimentos);
        if (status?.unavailable) notifyUnavailable(vue, status.message);
        else if (status) notify(status);
      } catch (error) {
        notify(error.message || 'Preenchimento retomado; faça a busca de horários manualmente.');
      } finally {
        // A vaga reaberta recompõe o cabeçalho depois do formulário; execute
        // mais uma passagem de layout quando o modal já tiver sido montado.
        tmRuntime.schedule(0);
      }
    } catch (error) {
      console.warn('[TM] Falha ao retomar rascunho:', error);
      notice = error.message || 'Não foi possível retomar o rascunho.';
    } finally {
      restoring = false;
      render();
    }
  }

  function ensureStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${DOCK_ID} { position: relative; display: flex; align-items: center;
        font-family: "Open Sans", "Helvetica Neue", sans-serif; font-size: 13px;
        color: #343a40; margin-right: 8px; }
      #${DOCK_ID} .tm-draft-trigger { position: relative; display: inline-flex;
        align-items: center; justify-content: center; width: 38px; height: 38px;
        min-width: 38px; min-height: 38px; padding: 0; border-radius: 13px;
        border: 1px solid rgba(255,255,255,.34); background: rgba(255,255,255,.12);
        color: #fff; line-height: 1; box-shadow: 0 4px 10px rgba(0,0,0,.10);
        backdrop-filter: blur(5px); -webkit-backdrop-filter: blur(5px);
        transition: transform .16s ease, background .16s ease, border-color .16s ease,
          box-shadow .16s ease; }
      #${DOCK_ID} .tm-draft-trigger:hover, #${DOCK_ID} .tm-draft-trigger:focus,
      #${DOCK_ID} .tm-draft-trigger[aria-expanded="true"] { background: rgba(255,255,255,.22);
        border-color: rgba(255,255,255,.58); box-shadow: 0 7px 16px rgba(0,0,0,.18);
        transform: translateY(-1px); }
      #${DOCK_ID} .tm-draft-trigger:active { transform: translateY(0); }
      #${DOCK_ID} .tm-draft-icon { font-size: 20px; line-height: 1; }
      #${DOCK_ID} .tm-draft-count { position: absolute; top: -5px; right: -5px;
        min-width: 17px; height: 17px; padding: 0 3px; border-radius: 9px;
        display: flex; align-items: center; justify-content: center;
        background: #fff; color: #075d48; border: 1px solid #075d48;
        font-size: 10px; font-weight: 700; line-height: 1; }
      #${DOCK_ID} button { border: 1px solid #adb5bd; background: #fff; color: #344054;
        border-radius: 5px; padding: 7px 10px; cursor: pointer; font: inherit; }
      #${DOCK_ID} button:hover { background: #f1f4f7; }
      #${DOCK_ID} button:disabled { opacity: .55; cursor: default; }
      #${DOCK_ID} .tm-draft-panel { position: absolute; top: calc(100% + 8px); right: 0;
        width: min(370px, calc(100vw - 24px)); z-index: 1100; max-height: min(460px, 75vh);
        overflow: auto; background: #fff; border: 1px solid #cbd5e1; border-radius: 7px;
        box-shadow: 0 8px 24px #0003; padding: 10px; }
      #${DOCK_ID} .tm-draft-item { position: relative; border-top: 1px solid #e6e9ed;
        padding: 11px 0; cursor: pointer; }
      #${DOCK_ID} .tm-draft-item:first-of-type { border-top: 0; }
      #${DOCK_ID} .tm-draft-name { display: block; color: #273444; }
      #${DOCK_ID} .tm-draft-operator { display: block; color: #273444;
        margin-bottom: 7px; overflow-wrap: anywhere; }
      #${DOCK_ID} .tm-draft-procedure-group + .tm-draft-procedure-group {
        border-top: 1px solid #d9dee5; margin-top: 6px; padding-top: 6px; }
      #${DOCK_ID} .tm-draft-line { min-height: 1.45em; color: #526171;
        line-height: 1.45; overflow-wrap: anywhere; }
      #${DOCK_ID} .tm-draft-date { padding-right: 36px; }
      #${DOCK_ID} .tm-draft-resume-hitbox { position: absolute; inset: 0; z-index: 1;
        width: 100%; height: 100%; padding: 0; border: 0 !important;
        background: transparent !important; box-shadow: none !important; }
      #${DOCK_ID} .tm-draft-resume-hitbox:focus:not(:focus-visible) {
        outline: none !important; }
      #${DOCK_ID} .tm-draft-resume-hitbox:focus-visible { outline: 2px solid #007bff !important;
        outline-offset: -2px; }
      #${DOCK_ID} .tm-draft-discard { position: absolute; right: 3px; bottom: 7px;
        z-index: 2; width: 28px; height: 28px; padding: 0; border: 0;
        background: transparent; color: #dc3545; font-size: 16px;
        opacity: 0; pointer-events: none; transition: opacity .15s ease; }
      #${DOCK_ID} .tm-draft-discard:hover { background: #fff1f2; color: #bd2130; }
      #${DOCK_ID} .tm-draft-item:hover .tm-draft-discard,
      #${DOCK_ID} .tm-draft-item:focus-within .tm-draft-discard {
        opacity: 1; pointer-events: auto; }
      @media (hover: none) {
        #${DOCK_ID} .tm-draft-discard { opacity: 1; pointer-events: auto; }
      }
      #${DOCK_ID} .tm-draft-note { margin-top: 7px; color: #6b4d00; }
      #${DOCK_ID} .tm-draft-empty { color: #667085; }
      #cadastroModal #${MODAL_BUTTON_ID}.btn-primary { background: #007bff;
        border-color: #007bff; color: #fff; }
      #cadastroModal #${MODAL_BUTTON_ID}.btn-primary:hover { background: #0069d9;
        border-color: #0062cc; }
    `;
    document.head.appendChild(style);
  }

  function ensureModalSave(canSave) {
    const modal = document.getElementById('cadastroModal');
    const existing = document.getElementById(MODAL_BUTTON_ID);
    if (!canSave || !modal) { existing?.remove(); return; }
    // Há outros modais aninhados no cadastro; o primeiro .modal-footer é oculto.
    const footer = modal.querySelector(':scope > .modal-dialog > .modal-content > .modal-footer');
    if (!footer || existing?.parentElement === footer) {
      if (existing) existing.disabled = saving || restoring;
      return;
    }
    existing?.remove();
    const button = document.createElement('button');
    button.id = MODAL_BUTTON_ID;
    button.type = 'button';
    button.className = 'btn btn-primary mr-auto';
    button.textContent = 'Colocar em espera';
    button.disabled = saving || restoring;
    button.addEventListener('click', save);
    footer.prepend(button);
  }

  function render() {
    const vue = component();
    const canSave = safeFlow(vue);
    const headerHost = document.querySelector('nav.navbar ul.navbar-nav.ml-auto');
    const currentUser = headerUserId();
    if (currentUser) checkOwner(vue || { $store: { state: { user: { id_usuario: currentUser } } } });
    syncUnloadGuard();
    ensureModalSave(canSave);
    let dock = document.getElementById(DOCK_ID);
    if (!headerHost || !currentUser) {
      dock?.remove();
      rendered = '';
      return;
    }
    ensureStyle();
    if (!dock || dock.parentElement !== headerHost) {
      dock?.remove();
      dock = document.createElement('li');
      dock.id = DOCK_ID;
      dock.className = 'nav-item';
      dock.setAttribute('aria-label', 'Rascunhos de agendamento');
      dock.addEventListener('click', (event) => {
        const button = event.target.closest('button[data-action]');
        if (!button) return;
        const action = button.dataset.action, id = Number(button.dataset.id);
        if (action === 'toggle') { open = !open; notice = ''; render(); }
        if (action === 'resume') resume(id);
        if (action === 'discard' && !saving && !restoring) {
          const item = drafts.find((draft) => draft.id === id);
          if (!item || !window.confirm(`Descartar o rascunho de ${item.patient}?`)) return;
          drafts.splice(drafts.indexOf(item), 1);
          notice = 'Rascunho descartado.';
          render();
        }
      });
      const calculator = headerHost.querySelector('[data-tm-datecalc-header-trigger="1"]')?.closest('li');
      headerHost.insertBefore(dock, calculator || headerHost.firstElementChild);
      rendered = '';
    }
    const signature = JSON.stringify([canSave, drafts.map((draft) => draft.id), open, notice, restoring, saving]);
    if (rendered === signature) return;
    rendered = signature;
    dock.replaceChildren();
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'tm-draft-trigger';
    toggle.dataset.action = 'toggle';
    toggle.title = `Em espera`;
    toggle.setAttribute('aria-label', `Em espera (${drafts.length})`);
    toggle.setAttribute('aria-expanded', String(open));
    const icon = document.createElement('span');
    icon.className = 'tm-draft-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = '📅';
    toggle.appendChild(icon);
    if (drafts.length) {
      const count = document.createElement('span');
      count.className = 'tm-draft-count';
      count.setAttribute('aria-hidden', 'true');
      count.textContent = String(drafts.length);
      toggle.appendChild(count);
    }
    dock.appendChild(toggle);
    if (open) {
      const panel = document.createElement('div');
      panel.className = 'tm-draft-panel';
      if (!drafts.length) {
        const empty = document.createElement('div');
        empty.className = 'tm-draft-empty';
        empty.textContent = 'Nenhuma marcação em espera';
        panel.appendChild(empty);
      }
      for (const draft of drafts) {
        const item = document.createElement('div');
        item.className = 'tm-draft-item';
        const name = document.createElement('strong');
        name.className = 'tm-draft-name';
        name.textContent = draft.patient;
        const line = (text) => {
          const element = document.createElement('div');
          element.className = 'tm-draft-line';
          element.textContent = text;
          return element;
        };
        const operator = document.createElement('strong');
        operator.className = 'tm-draft-operator';
        operator.textContent = draft.operator || '—';
        const groups = draft.groups?.length ? draft.groups : [{
          procedure: draft.procedure, professional: draft.professional,
          dateTime: draft.times?.join(' · ') || displayDate(draft.preferred?.date)
        }];
        const groupElements = groups.map((group) => {
          const element = document.createElement('div');
          element.className = 'tm-draft-procedure-group';
          const date = line(group.dateTime || '—');
          date.classList.add('tm-draft-date');
          element.append(line(group.procedure || '—'), line(group.professional || '—'), date);
          return element;
        });
        const resumeButton = document.createElement('button');
        resumeButton.type = 'button';
        resumeButton.className = 'tm-draft-resume-hitbox';
        resumeButton.dataset.action = 'resume';
        resumeButton.dataset.id = String(draft.id);
        resumeButton.setAttribute('aria-label', `Retomar agendamento de ${draft.patient}`);
        resumeButton.disabled = saving || restoring;
        const discard = document.createElement('button');
        discard.type = 'button';
        discard.className = 'tm-draft-discard';
        discard.dataset.action = 'discard';
        discard.dataset.id = String(draft.id);
        discard.setAttribute('aria-label', `Descartar rascunho de ${draft.patient}`);
        discard.title = 'Descartar rascunho';
        discard.disabled = saving || restoring;
        const trash = document.createElement('i');
        trash.className = 'far fa-trash-alt';
        trash.setAttribute('aria-hidden', 'true');
        discard.appendChild(trash);
        item.append(name, operator, ...groupElements, resumeButton, discard);
        panel.appendChild(item);
      }
      if (notice) {
        const message = document.createElement('div');
        message.className = 'tm-draft-note';
        message.setAttribute('role', 'status');
        message.textContent = notice;
        panel.appendChild(message);
      }
      dock.appendChild(panel);
    }
  }

  function ensureDrafts() {
    const route = window.location.hash;
    if (route !== lastRoute) {
      lastRoute = route;
      open = false;
      rendered = '';
    }
    if (pendingResume && !restoring && component()) resume(pendingResume);
    render();
  }

  document.addEventListener('click', (event) => {
    // O render troca o botão durante o clique; target.closest() deixa de achar
    // o dock depois da remoção, mas composedPath() preserva o caminho original.
    const inside = event.composedPath().some((node) =>
      node?.id === DOCK_ID || node?.id === MODAL_BUTTON_ID);
    if (open && !inside) {
      open = false;
      render();
    }
  });
  document.addEventListener('keydown', (event) => {
    if (open && event.key === 'Escape') {
      open = false;
      render();
    }
  });
  document.addEventListener('tm-datecalc-opened', () => {
    if (open) {
      open = false;
      render();
    }
  });

  // O botão mora no cabeçalho global; somente salvar/retomar exige o Call Center.
  tmRuntime.register('rascunhos de agendamento do Call Center', ensureDrafts);
})();

/* =========================
   RECEPÇÃO - NOVO ATENDIMENTO
========================= */
(function () {
  'use strict';

  const MODAL_ID = 'novoAtendimento2Modal';
  const STYLE_ID = 'tm-recepcao-novo-atendimento-layout';
  let observedModal = null;
  let modalObserver = null;
  let observationWindowStart = 0;
  let observationCount = 0;
  let observationStopped = false;
  let extraWasVisible = false;
  let extraDefaultApplied = false;
  let originTemplate = null;
  let originRequest = null;
  let originUnavailable = false;
  let originLastAttempt = 0;
  let originWasVisible = false;
  let originInjectedComponent = null;
  let originRenderedField = null;
  let originRenderedOwner = null;
  const guardedBookings = new WeakSet();
  const bookingModals = new WeakMap();
  const validationAttempted = new WeakSet();
  const lastValidationToast = new WeakMap();
  const lastEnteredCpf = new WeakMap();

  function setClass(element, className, active) {
    if (element.classList.contains(className) !== active) {
      element.classList.toggle(className, active);
    }
  }

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #${MODAL_ID} > .modal-dialog.modal-dialog-total.modal-dialog22 {
        width: 1180px !important;
        max-width: calc(100vw - 32px) !important;
        height: auto !important;
        min-height: 0 !important;
        margin: 16px auto !important;
      }

      #${MODAL_ID} > .modal-dialog > .modal-content.modal-content-total.modal-content22 {
        width: 100% !important;
        height: auto !important;
        min-height: 0 !important;
        max-height: calc(100dvh - 32px) !important;
      }

      #${MODAL_ID} > .modal-dialog > .modal-content > .modal-body {
        flex: 0 1 auto !important;
        height: auto !important;
        min-height: 0 !important;
        overflow-x: hidden !important;
        overflow-y: auto !important;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo > .modal-dialog.modal-dialog-total.modal-dialog22 {
        width: 920px !important;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center {
        display: flex !important;
        flex-direction: column !important;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center > .col-lg-8 {
        display: contents !important;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center > .col-lg-8 > * {
        order: 3;
        width: 100%;
        padding-left: 15px;
        padding-right: 15px;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center > .col-lg-8 > .row:first-child {
        order: 1;
        margin-left: 0;
        margin-right: 0;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center > .col-lg-8 > .row:first-child > .col {
        padding-left: 0;
        padding-right: 0;
      }

      #${MODAL_ID}.tm-recepcao-voltar-apos-concluir .modal-body > div > .form-row.justify-content-center > .col-lg-8 > .row.w3-animate-opacity {
        order: 4;
        margin-left: 0 !important;
        margin-right: 0 !important;
      }

      #${MODAL_ID}.tm-recepcao-voltar-apos-concluir .modal-body > div > .form-row.justify-content-center > .col-lg-8 > .row.w3-animate-opacity > .col {
        padding-left: 0 !important;
        padding-right: 0 !important;
      }

      #${MODAL_ID}.tm-recepcao-voltar-apos-concluir .tm-recepcao-concluir-section > br {
        display: none !important;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center > .col-lg-4 {
        order: 2;
        flex: 0 0 auto !important;
        width: 100% !important;
        max-width: 100% !important;
        padding-left: 15px !important;
        padding-right: 15px !important;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center > .col-lg-4 > .row {
        margin-left: 0;
        margin-right: 0;
      }

      #${MODAL_ID}.tm-recepcao-coluna-abaixo .modal-body > div > .form-row.justify-content-center > .col-lg-4 > .row > .col {
        padding-left: 0;
        padding-right: 0;
      }

      #${MODAL_ID} > .modal-dialog > .modal-content > .modal-body > div > .form-row.justify-content-center > .col-lg-4 > .row li.list-group-item.list-group-item-success {
        display: none !important;
      }

      #${MODAL_ID} .tm-recepcao-hidden-field {
        display: none !important;
      }

      #${MODAL_ID} .tm-recepcao-origem-titulo-oculto {
        display: none !important;
      }

      #${MODAL_ID} .tm-recepcao-warning-host { position: relative !important; }
      #${MODAL_ID} .tm-recepcao-required-warning {
        position: absolute !important; z-index: 3; display: inline-flex;
        align-items: center; justify-content: center; width: 24px;
        color: #dc3545; background: #f8d7da; border-right: 1px solid #f5c6cb;
        border-radius: 3px 0 0 3px; font-weight: 700;
        pointer-events: none;
      }
      #${MODAL_ID} .tm-recepcao-warning-control { padding-left: 30px !important; }

      #${MODAL_ID} .tm-recepcao-birth-field .input-group {
        display: flex !important; flex-wrap: nowrap !important; align-items: stretch !important;
        width: 100% !important; min-width: 0 !important;
      }
      #${MODAL_ID} .tm-recepcao-birth-field .input-group > .form-control {
        flex: 1 1 auto !important; width: 0 !important; min-width: 0 !important;
      }
      #${MODAL_ID} .tm-recepcao-birth-field .input-group > .input-group-append {
        display: flex !important; flex: 0 0 auto !important;
      }
      #${MODAL_ID} .tm-recepcao-birth-field .input-group-text {
        font-family: "Open Sans", "Helvetica Neue", sans-serif !important;
        font-size: 13.125px !important; font-weight: 400 !important;
        color: #495057 !important; line-height: 1.2 !important;
      }
      #${MODAL_ID} .tm-recepcao-existing-identity-row .tm-recepcao-identity-name {
        flex: 0 0 50% !important; max-width: 50% !important;
      }
      #${MODAL_ID} .tm-recepcao-existing-identity-row .tm-recepcao-identity-birth,
      #${MODAL_ID} .tm-recepcao-existing-identity-row .tm-recepcao-identity-cpf {
        flex: 0 0 25% !important; max-width: 25% !important;
      }
      #${MODAL_ID} .tm-recepcao-existing-identity-row .form-control,
      #${MODAL_ID} .tm-recepcao-existing-identity-row .input-group-text {
        font-family: "Open Sans", "Helvetica Neue", sans-serif !important;
        font-size: .875rem !important;
        font-weight: 400 !important;
        line-height: 1.5 !important;
        color: #495057 !important;
        height: calc(1.5em + .5rem + 2px) !important;
        padding: .25rem .5rem !important;
        box-sizing: border-box !important;
      }
      #${MODAL_ID} .tm-recepcao-hidden-patient-card,
      #${MODAL_ID} .tm-recepcao-hidden-native-patient-row {
        display: none !important;
      }
      #${MODAL_ID} .tm-recepcao-perfil-append button {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        font-size: .875rem !important;
        line-height: 1.5 !important;
        height: calc(1.5em + .5rem + 2px) !important;
        min-width: 36px !important;
        padding: 0 !important;
      }
      #${MODAL_ID} .tm-recepcao-perfil-append button i {
        display: block !important;
        margin: 0 !important;
        line-height: 1 !important;
      }

      @media (max-width: 767px) {
        #${MODAL_ID} .tm-recepcao-existing-identity-row > .col {
          flex: 0 0 100% !important; max-width: 100% !important;
        }
      }

      @media (min-width: 768px) {
        #${MODAL_ID} .form-row > .tm-recepcao-origem-col {
          flex: 0 0 25% !important;
          max-width: 25% !important;
        }

        #${MODAL_ID} .form-row > .tm-recepcao-observacao-col {
          flex: 0 0 50% !important;
          max-width: 50% !important;
        }

        #${MODAL_ID}.tm-recepcao-primeira-vez .tm-recepcao-dados-row > .col:not(.tm-recepcao-hidden-field) {
          flex: 0 0 25% !important;
          max-width: 25% !important;
        }

        #${MODAL_ID}.tm-recepcao-primeira-vez .tm-recepcao-contato-row > .col:not(.tm-recepcao-hidden-field) {
          flex: 0 0 33.333333% !important;
          max-width: 33.333333% !important;
        }

        #${MODAL_ID}.tm-recepcao-primeira-vez .tm-recepcao-dados-row > .tm-recepcao-cpf-col {
          flex: 0 0 25% !important;
          max-width: 25% !important;
        }

      }

      #${MODAL_ID} .tm-recepcao-origem-col .input-group,
      #${MODAL_ID} .tm-recepcao-observacao-col input,
      #${MODAL_ID} .tm-recepcao-observacao-col textarea {
        width: 100% !important;
        max-width: 100% !important;
      }

      #${MODAL_ID} .tm-recepcao-origem-col .input-group {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: stretch !important;
      }

      #${MODAL_ID} .tm-recepcao-origem-col .input-group > select.form-control {
        flex: 1 1 auto !important;
        width: 0 !important;
        min-width: 0 !important;
      }

      #${MODAL_ID} .tm-recepcao-origem-col .input-group > :not(select) {
        flex: 0 0 auto !important;
      }
    `;
    document.head.appendChild(style);
  }

  function fieldByLabel(modal, labelText) {
    const label = Array.from(modal.querySelectorAll('small.form-text.text-muted'))
      .find((small) => small.closest('.modal') === modal && norm(small.textContent) === labelText);
    return label?.closest('.col') || null;
  }

  function receptionOriginField(modal, contactRow) {
    const owner = receptionBookingComponent(modal);
    let field = fieldByLabel(modal, 'Origem do Agendamento');
    if (field) {
      originRenderedField = field;
      originRenderedOwner = owner;
      return field;
    }
    if (!owner || !contactRow) return null;
    const pending = [owner], seen = new Set();
    while (pending.length && seen.size < 200) {
      const child = pending.pop();
      if (!child || seen.has(child)) continue;
      seen.add(child);
      if (norm(child.label) === 'Origem do Agendamento') {
        const candidate = child.$el?.closest?.('.col');
        if (candidate?.querySelector('select')) {
          field = candidate;
          break;
        }
      }
      pending.push(...(child.$children || []));
    }
    if (!field && originRenderedOwner === owner && originRenderedField?.querySelector('select')) {
      field = originRenderedField;
    }
    if (!field) return null;
    if (field.parentElement !== contactRow) contactRow.appendChild(field);
    field.classList.remove('tm-recepcao-hidden-field');
    originRenderedField = field;
    originRenderedOwner = owner;
    return field;
  }

  function arrangeReceptionBookingFields(modal) {
    const email = fieldByLabel(modal, 'e-mail');
    const cellular = fieldByLabel(modal, 'Celular');
    const contactRow = cellular?.parentElement;
    const origin = receptionOriginField(modal, contactRow);
    if (origin && contactRow?.classList.contains('form-row') && contactRow.contains(email) &&
        (origin.parentElement !== contactRow || origin.previousElementSibling !== cellular)) {
      contactRow.insertBefore(origin, cellular.nextSibling);
    }
    if (origin) setClass(origin, 'tm-recepcao-origem-col', true);

    for (const small of modal.querySelectorAll('.border-bottom small')) {
      if (norm(small.textContent) !== 'Origem do Agendamento') continue;
      const title = small.closest('.border-bottom');
      if (title && !title.querySelector('input, select, textarea')) {
        setClass(title, 'tm-recepcao-origem-titulo-oculto', true);
      }
    }
  }

  function arrangeFirstTimeReceptionFields(modal) {
    const name = fieldByLabel(modal, 'Nome');
    const birth = fieldByLabel(modal, 'Data de Nascimento');
    const cpf = fieldByLabel(modal, 'CPF');
    const email = fieldByLabel(modal, 'e-mail');
    const cellular = fieldByLabel(modal, 'Celular');
    const sex = fieldByLabel(modal, 'Sexo');
    const origin = fieldByLabel(modal, 'Origem do Agendamento');
    const detailsRow = birth?.parentElement;
    const contactRow = email?.parentElement;
    if (![name, birth, cpf, email, cellular, sex].every(Boolean) ||
        !detailsRow?.classList.contains('form-row') ||
        !contactRow?.classList.contains('form-row') || detailsRow === contactRow) return;

    const placeAfter = (row, field, previous) => {
      if (field.parentElement !== row || field.previousElementSibling !== previous) {
        row.insertBefore(field, previous ? previous.nextElementSibling : row.firstElementChild);
      }
    };
    placeAfter(detailsRow, name, null);
    placeAfter(detailsRow, birth, name);
    placeAfter(detailsRow, cpf, birth);
    placeAfter(detailsRow, sex, cpf);
    placeAfter(contactRow, email, null);
    placeAfter(contactRow, cellular, email);
    if (origin) placeAfter(contactRow, origin, cellular);
    setClass(detailsRow, 'tm-recepcao-dados-row', true);
    setClass(contactRow, 'tm-recepcao-contato-row', true);
  }

  function patientIdentity(patient, keys) {
    for (const source of [patient, patient?.cadastro, patient?.pessoa]) {
      for (const key of keys) {
        const value = source?.[key];
        if (typeof value === 'string' && value.trim()) return value.trim();
      }
    }
    return '';
  }

  function patientBirth(patient) {
    const known = patientIdentity(patient, ['dt_nascimento', 'data_nascimento',
      'st_data_nascimento', 'st_nascimento', 'dt_data_nascimento', 'birth_date']);
    if (known) return known;
    for (const source of [patient, patient?.cadastro, patient?.pessoa]) {
      const entry = Object.entries(source || {}).find(([key, value]) =>
        /nasc|birth/i.test(key) && typeof value === 'string' && value.trim());
      if (entry) return entry[1].trim();
    }
    return '';
  }

  function displayBirth(value) {
    const iso = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
    const local = String(value || '').match(/^(\d{2})[/-](\d{2})[/-](\d{4})/);
    return local ? `${local[3]}-${local[2]}-${local[1]}` : '';
  }

  function displayCpf(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return digits.length === 11 ? `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}` : '';
  }

  function identityField(row, key, labelText) {
    let field = row.querySelector(`.tm-recepcao-identity-${key}`);
    if (field) return field;
    field = document.createElement('div');
    field.className = `col col-12 tm-recepcao-identity-${key}`;
    if (key === 'birth') field.classList.add('tm-recepcao-birth-field');
    const label = document.createElement('small');
    label.className = 'form-text text-muted';
    label.textContent = labelText;
    const group = document.createElement('div');
    group.className = 'input-group';
    const input = document.createElement('input');
    input.className = 'form form-control';
    input.type = key === 'birth' ? 'date' : 'text';
    input.readOnly = true;
    input.setAttribute('aria-readonly', 'true');
    group.appendChild(input);
    if (key === 'name') {
      const append = document.createElement('div');
      append.className = 'input-group-append tm-recepcao-perfil-append';
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'btn btn-outline-primary tm-recepcao-perfil-button';
      button.title = 'Abrir perfil do paciente';
      button.setAttribute('aria-label', 'Abrir perfil do paciente');
      const icon = document.createElement('i');
      icon.className = 'fa-solid fa-id-badge';
      icon.setAttribute('aria-hidden', 'true');
      button.appendChild(icon);
      append.appendChild(button);
      group.appendChild(append);
    }
    if (key === 'birth') {
      const append = document.createElement('div');
      append.className = 'input-group-append';
      const age = document.createElement('span');
      age.className = 'input-group-text tm-recepcao-identity-age';
      append.appendChild(age);
      group.appendChild(append);
    }
    field.append(label, group);
    row.appendChild(field);
    return field;
  }

  function showExistingIdentity(modal, contactRow) {
    const component = receptionBookingComponent(modal);
    const patient = component?.dados?.paciente;
    if (!contactRow || !(Number(patient?.id_pessoa) > 0)) {
      modal.querySelector('.tm-recepcao-existing-identity-row')?.remove();
      return;
    }
    let row = modal.querySelector('.tm-recepcao-existing-identity-row');
    if (!row) {
      row = document.createElement('div');
      row.className = 'form-row tm-recepcao-existing-identity-row';
    }
    if (row.parentElement !== contactRow.parentElement || row.nextElementSibling !== contactRow) {
      contactRow.parentElement.insertBefore(row, contactRow);
    }
    const name = identityField(row, 'name', 'Nome');
    const birth = identityField(row, 'birth', 'Data de Nascimento');
    const cpf = identityField(row, 'cpf', 'CPF');
    const values = [
      patientIdentity(patient, ['st_nome', 'nome', 'nm_pessoa', 'st_nome_paciente']),
      displayBirth(patientBirth(patient)),
      displayCpf(patientIdentity(patient, ['st_cpf', 'cpf']) || lastEnteredCpf.get(modal))
    ];
    [name, birth, cpf].forEach((field, index) => {
      const input = field.querySelector('input');
      if (input.value !== values[index]) input.value = values[index];
    });
    const value = values[1];
    const parts = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const age = birth.querySelector('.tm-recepcao-identity-age');
    const ageDate = parts ? new Date(Number(parts[1]), Number(parts[2]) - 1, Number(parts[3])) : null;
    const today = new Date();
    const years = ageDate && !Number.isNaN(ageDate.getTime()) ? today.getFullYear() - ageDate.getFullYear() -
      (today.getMonth() < ageDate.getMonth() ||
        (today.getMonth() === ageDate.getMonth() && today.getDate() < ageDate.getDate()) ? 1 : 0) : null;
    const text = years != null && years >= 0 && years < 130 ? `${years}a` : '';
    if (age.textContent !== text) age.textContent = text;
    age.parentElement.style.display = text ? '' : 'none';
  }

  function openReceptionPatientProfile(modal, event) {
    const button = event.target?.closest?.('button');
    if (!button || button.closest(`#${MODAL_ID}`) !== modal ||
        !(button.classList?.contains('tm-recepcao-perfil-button') ||
          (norm(button.title) === 'Histórico do paciente.' && button.querySelector('.fa-id-badge')))) return false;
    const component = receptionBookingComponent(modal);
    const patient = component?.dados?.paciente;
    if (!(Number(patient?.id_pessoa) > 0) || typeof component?.$root?.perfil !== 'function') return false;

    // O clique nativo fecha Novo Atendimento antes de abrir o perfil e perde o formulário.
    event.preventDefault();
    event.stopImmediatePropagation();
    // A ação raiz do Klingo apenas abre o perfil; não é necessário fechar o agendamento.
    component.$root.perfil(patient);
    return true;
  }

  function hideRedundantReceptionPatientControls(modal, existingPatient) {
    const nativeButton = modal.querySelector('button[title="Histórico do paciente."]');
    const nativeRow = nativeButton?.closest('.row.d-flex.justify-content-center.mb-2.w3-animate-opacity');
    if (nativeRow) setClass(nativeRow, 'tm-recepcao-hidden-native-patient-row', existingPatient);
    modal.querySelectorAll('.alert.alert-light.alert-dismissible.border').forEach((card) => {
      if (card.querySelector('a.card-link')) {
        setClass(card, 'tm-recepcao-hidden-patient-card', existingPatient);
      }
    });
  }

  function alignReceptionBirth(modal) {
    const name = fieldByLabel(modal, 'Nome')?.querySelector('input');
    const birth = fieldByLabel(modal, 'Data de Nascimento');
    const group = birth?.querySelector('.input-group');
    if (!name || !group) return;
    birth.classList.add('tm-recepcao-birth-field');
    const nameRect = name.getBoundingClientRect();
    const groupRect = group.getBoundingClientRect();
    if (!nameRect.height || !groupRect.height) return;
    const height = `${nameRect.height}px`;
    for (const element of [group, ...group.querySelectorAll('input, .input-group-append, .input-group-text')]) {
      if (element.style.getPropertyValue('height') !== height) {
        element.style.setProperty('height', height, 'important');
      }
    }
    const difference = nameRect.top - groupRect.top;
    if (Math.abs(difference) > 0.5) {
      const current = parseFloat(getComputedStyle(group).marginTop) || 0;
      const margin = `${Math.round((current + difference) * 100) / 100}px`;
      if (group.style.getPropertyValue('margin-top') !== margin) {
        group.style.setProperty('margin-top', margin, 'important');
      }
    }
  }

  function protectReceptionBirthDate(modal) {
    const input = fieldByLabel(modal, 'Data de Nascimento')?.querySelector('input[type="date"]');
    if (!input || input.dataset.tmReceptionBirthGuard === '1') return;
    input.dataset.tmReceptionBirthGuard = '1';
    input.addEventListener('paste', (event) => {
      const parsed = tmParseDateInput(event.clipboardData?.getData('text/plain') || '');
      if (!parsed) return;
      event.preventDefault();
      input.value = parsed;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }, true);
    let lastValue = input.value, yearDigits = 0, yearActive = false, replacement = '', writing = false;
    const parts = (value) => /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    const reset = () => { lastValue = input.value; yearDigits = 0; yearActive = false; replacement = ''; };
    input.addEventListener('pointerdown', reset, true);
    input.addEventListener('focus', reset, true);
    input.addEventListener('keydown', (event) => {
      if (/^(?:Arrow|Backspace|Delete|Tab|Home|End)/.test(event.key)) { reset(); return; }
      if (!/^\d$/.test(event.key) || event.ctrlKey || event.metaKey || event.altKey) return;
      const current = parts(input.value);
      if (!current || (!replacement && (!yearActive || yearDigits < 4))) return;
      event.preventDefault();
      replacement = replacement.length === 4 ? event.key : replacement + event.key;
      const year = replacement.padStart(4, '0');
      if (Number(year) === 0) return;
      const next = `${year}-${current[2]}-${current[3]}`;
      if (input.value !== next) {
        writing = true;
        input.value = next;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
        writing = false;
      }
      lastValue = input.value;
      yearActive = true;
      yearDigits = replacement.length;
    }, true);
    input.addEventListener('input', () => {
      if (writing) return;
      const before = parts(lastValue), after = parts(input.value);
      if (after && (!before || before[1] !== after[1]) &&
          (!before || (before[2] === after[2] && before[3] === after[3]))) {
        yearActive = true;
        yearDigits = Math.min(4, yearDigits + 1);
      } else if (!after || (before && (before[2] !== after[2] || before[3] !== after[3]))) {
        yearActive = false;
        yearDigits = 0;
        replacement = '';
      }
      lastValue = input.value;
    }, true);
  }

  function requiredReceptionCpf(modal) {
    const input = fieldByLabel(modal, 'CPF')?.querySelector('input');
    if (input && !input.readOnly) {
      input.required = true;
      input.setAttribute('aria-required', 'true');
    }
    return input || null;
  }

  function optionalReceptionEmail(modal) {
    const input = fieldByLabel(modal, 'e-mail')?.querySelector('input') ||
      modal.querySelector('input[type="email"], input[name*="email" i], input[id*="email" i]');
    if (!input) return;
    input.required = false;
    input.removeAttribute('aria-required');
    if (!norm(input.value)) input.setCustomValidity?.('');
  }

  function receptionRequiredControls(modal) {
    const firstTime = !!fieldByLabel(modal, 'Nome Social');
    const fields = firstTime ? [
      ['Nome', 'input'], ['Data de Nascimento', 'input'], ['CPF', 'input'],
      ['Sexo', 'select'], ['Celular', 'input'], ['Origem do Agendamento', 'select']
    ] : [['Celular', 'input'], ['Origem do Agendamento', 'select']];
    return fields.map(([name, selector]) => {
      const field = fieldByLabel(modal, name);
      const control = field?.querySelector(selector) || null;
      const value = norm(control?.value);
      const selectedText = norm(control?.selectedOptions?.[0]?.textContent);
      const missing = !control || !value ||
        (control.tagName === 'SELECT' && /^Selecione/i.test(selectedText));
      return { name, field, control, missing };
    }).filter((item) => firstTime || (item.control && !item.control.readOnly));
  }

  function setReceptionWarning(field, control, invalid) {
    if (!field || !control) return;
    const host = control.parentElement;
    if (!host) return;
    host.classList.add('tm-recepcao-warning-host');
    let warning = host.querySelector(':scope > .tm-recepcao-required-warning');
    if (!invalid) {
      warning?.remove();
      control.classList.remove('tm-recepcao-warning-control');
      return;
    }
    if (!warning) {
      warning = document.createElement('span');
      warning.className = 'tm-recepcao-required-warning';
      warning.textContent = '!';
      warning.setAttribute('aria-hidden', 'true');
      host.appendChild(warning);
    }
    const position = { top: `${control.offsetTop + 1}px`, left: `${control.offsetLeft + 1}px`,
      height: `${Math.max(0, control.offsetHeight - 2)}px` };
    for (const [key, value] of Object.entries(position)) {
      if (warning.style[key] !== value) warning.style[key] = value;
    }
    control.classList.add('tm-recepcao-warning-control');
  }

  function refreshReceptionWarnings(modal) {
    if (!validationAttempted.has(modal)) return;
    for (const { field, control, missing } of receptionRequiredControls(modal)) {
      setReceptionWarning(field, control, missing);
    }
  }

  function clearReceptionWarnings(modal) {
    validationAttempted.delete(modal);
    lastValidationToast.delete(modal);
    modal.querySelectorAll('.tm-recepcao-required-warning').forEach((warning) => warning.remove());
    modal.querySelectorAll('.tm-recepcao-warning-control').forEach((control) =>
      control.classList.remove('tm-recepcao-warning-control'));
  }

  function validateRequiredReceptionFields(modal, event) {
    optionalReceptionEmail(modal);
    requiredReceptionCpf(modal);
    validationAttempted.add(modal);
    const missing = receptionRequiredControls(modal).filter((item) => item.missing);
    refreshReceptionWarnings(modal);
    if (!missing.length) return true;

    event?.preventDefault();
    event?.stopImmediatePropagation();

    const component = receptionBookingComponent(modal);
    const message = missing.length === 1 ? `O campo ${missing[0].name} é obrigatório.` :
      'Verificar preenchimento dos campos obrigatórios.';
    if (Date.now() - (lastValidationToast.get(modal) || 0) > 1000) {
      component?.$toast?.add?.({ severity: 'error', summary: 'Atenção', detail: message, life: 5000 });
      lastValidationToast.set(modal, Date.now());
    }
    const first = missing.find(({ control }) => control)?.control;
    first?.focus();
    if (!component?.$toast?.add) {
      if (first?.setCustomValidity) {
        first.setCustomValidity(message);
        first.reportValidity();
        first.addEventListener('input', () => first.setCustomValidity(''), { once: true });
      } else {
        window.alert(message);
      }
    }
    return false;
  }

  function guardReceptionBooking(modal) {
    const component = receptionBookingComponent(modal);
    if (!component) return;
    bookingModals.set(component, modal);
    if (guardedBookings.has(component)) return;
    const original = component.marcar;
    component.marcar = function (...args) {
      const activeModal = bookingModals.get(component);
      const visible = activeModal?.isConnected &&
        (activeModal.classList.contains('show') || getComputedStyle(activeModal).display !== 'none');
      if (visible && !validateRequiredReceptionFields(activeModal)) return;
      return original.apply(this, args);
    };
    guardedBookings.add(component);
  }

  function extraCheckbox(modal) {
    const column = Array.from(modal.querySelectorAll('.col.col-12.col-md-3')).find((col) =>
      col.closest('.modal') === modal &&
      Array.from(col.querySelectorAll('.border-bottom small'))
        .some((small) => norm(small.textContent) === 'Horário') &&
      Array.from(col.querySelectorAll('label'))
        .some((label) => norm(label.textContent) === 'Extra')
    );
    return column?.querySelector('input[type="checkbox"]') || null;
  }

  function localDateKey(date = new Date()) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function receptionAppointmentDate(modal, component) {
    const componentDate = component?.data;
    const pageDate = document.querySelector('input#ref-data[type="date"]')?.value;
    const match = String(componentDate || pageDate || '').match(/^\d{4}-\d{2}-\d{2}/);
    return match?.[0] || '';
  }

  function applyExtraDefault(modal) {
    const visible = modal.classList.contains('show') || getComputedStyle(modal).display !== 'none';
    if (!visible) {
      extraWasVisible = false;
      extraDefaultApplied = false;
      return;
    }
    if (!extraWasVisible) {
      extraWasVisible = true;
      extraDefaultApplied = false;
    }
    if (extraDefaultApplied) return;

    const checkbox = extraCheckbox(modal);
    const component = receptionBookingComponent(modal);
    const appointmentDate = receptionAppointmentDate(modal, component);
    if (!checkbox || !appointmentDate) return;
    extraDefaultApplied = true;
    const shouldBeExtra = appointmentDate === localDateKey();
    if (component && component.extra !== shouldBeExtra) component.extra = shouldBeExtra;
    if (checkbox.checked !== shouldBeExtra) {
      checkbox.checked = shouldBeExtra;
      checkbox.dispatchEvent(new Event('input', { bubbles: true }));
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function isOriginField(field) {
    const content = JSON.stringify(field || {}).normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return /origem do agendamento/i.test(content);
  }

  function hasOriginField(config) {
    return Array.isArray(config?.js_campos) && config.js_campos.some(isOriginField);
  }

  function cloneConfig(config) {
    return JSON.parse(JSON.stringify(config));
  }

  function receptionBookingComponent(modal) {
    let element = modal;
    while (element) {
      const component = element.__vue__;
      if (component?.origem === 'recep' && typeof component.marcar === 'function') return component;
      const marcacao = component?.$refs?.marcacao;
      if (marcacao?.origem === 'recep' && typeof marcacao.marcar === 'function') return marcacao;
      element = element.parentElement;
    }

    // O modal pode ser montado fora da árvore DOM do componente pai.
    element = document.getElementById('filtro-medico');
    while (element) {
      const marcacao = element.__vue__?.$refs?.marcacao;
      if (marcacao?.origem === 'recep' && typeof marcacao.marcar === 'function') return marcacao;
      element = element.parentElement;
    }
    return null;
  }

  function installOriginConfig(component, config) {
    if (!hasOriginField(config)) return false;
    const existing = component.campos_customizados_base;
    if (Array.isArray(existing?.js_campos) && existing.js_campos.length && !hasOriginField(existing)) {
      // Preserva outros campos específicos da agenda que o Klingo já carregou.
      for (const field of config.js_campos.filter(isOriginField)) {
        existing.js_campos.push(cloneConfig(field));
      }
    } else {
      component.campos_customizados_base = cloneConfig(config);
    }
    component.force_exibir_campos_customizados = true;
    originInjectedComponent = component;
    return true;
  }

  function ensureOriginField(modal) {
    const visible = modal.classList.contains('show') || getComputedStyle(modal).display !== 'none';
    if (!visible) {
      originWasVisible = false;
      originRenderedField = null;
      originRenderedOwner = null;
      lastEnteredCpf.delete(modal);
      return;
    }
    if (!modal.querySelector('.modal-body') || !modal.textContent.includes('Concluir')) return;

    const component = receptionBookingComponent(modal);
    if (!component?.dados) return;

    if (!originWasVisible) {
      originWasVisible = true;
      // O componente Vue é reutilizado entre atendimentos: não reaproveite a origem anterior.
      if (originInjectedComponent === component && hasOriginField(component.campos_customizados_base)) {
        for (const field of component.campos_customizados_base.js_campos.filter(isOriginField)) {
          field.value = null;
        }
        component.force_exibir_campos_customizados = true;
        return;
      }
    }

    if (hasOriginField(component.campos_customizados_base)) {
      component.force_exibir_campos_customizados = true;
      return;
    }
    if (installOriginConfig(component, component.faixaHorarios?.campos_customizados)) return;
    if (installOriginConfig(component, originTemplate)) return;
    if (originRequest || originUnavailable || Date.now() - originLastAttempt < 15000 ||
        typeof component.axios?.post !== 'function') return;

    const query = { q: [{ name: 'marcacoes.campos_customizados', id: 'campos_custom', parms: {} }] };
    originLastAttempt = Date.now();
    originRequest = component.axios.post('/aql?a=marcacoes.campos_customizados', query)
      .then((response) => {
        const result = response?.data?.campos_custom;
        if (result?.status !== 200 || !hasOriginField(result.data)) {
          originUnavailable = true;
          console.warn('[TM] Origem do Agendamento indisponível na configuração do Klingo.');
          return;
        }
        originTemplate = cloneConfig(result.data);
        if (observedModal === modal && modal.isConnected && component.dados &&
            (modal.classList.contains('show') || getComputedStyle(modal).display !== 'none')) {
          installOriginConfig(component, originTemplate);
        }
      })
      .catch((error) => {
        console.warn('[TM] Não foi possível carregar Origem do Agendamento.', error);
      })
      .finally(() => { originRequest = null; });
  }

  function applyReceptionLayout() {
    const modal = observedModal;
    if (!modal?.isConnected) return;
    if (!modal.classList.contains('show') && getComputedStyle(modal).display === 'none' &&
        validationAttempted.has(modal)) clearReceptionWarnings(modal);

    const mainRow = modal.querySelector('.modal-body > div > .form-row.justify-content-center');
    // A coluna vazia não deve reservar espaço enquanto os primeiros campos são preenchidos.
    setClass(modal, 'tm-recepcao-coluna-abaixo',
      !!mainRow?.querySelector(':scope > .col-lg-8, :scope > .col-lg-4'));

    const leftColumn = mainRow?.querySelector(':scope > .col-lg-8');
    const formButtons = Array.from(leftColumn?.querySelectorAll('button') || []);
    const backButton = formButtons.find((button) => norm(button.textContent) === 'Voltar');
    const concludeButton = formButtons.find((button) => norm(button.textContent) === 'Concluir');
    const concludeSection = Array.from(leftColumn?.children || [])
      .find((section) => concludeButton && section.contains(concludeButton));
    leftColumn?.querySelectorAll(':scope > .tm-recepcao-concluir-section').forEach((section) =>
      setClass(section, 'tm-recepcao-concluir-section', section === concludeSection));
    if (concludeSection) setClass(concludeSection, 'tm-recepcao-concluir-section', true);
    setClass(modal, 'tm-recepcao-voltar-apos-concluir',
      !!backButton?.closest('.row.w3-animate-opacity') && !!concludeButton);

    applyExtraDefault(modal);
    ensureOriginField(modal);
    guardReceptionBooking(modal);
    arrangeReceptionBookingFields(modal);

    const social = fieldByLabel(modal, 'Nome Social');
    const phone = fieldByLabel(modal, 'Telefone');
    if (phone) setClass(phone, 'tm-recepcao-hidden-field', true);
    const phoneInput = phone?.querySelector('input');
    if (phoneInput) {
      phoneInput.required = false;
      phoneInput.removeAttribute('aria-required');
    }
    const cpf = fieldByLabel(modal, 'CPF');
    if (social) {
      const entered = cpf?.querySelector('input')?.value;
      if (String(entered || '').replace(/\D/g, '').length === 11) lastEnteredCpf.set(modal, entered);
      else lastEnteredCpf.delete(modal);
    }
    requiredReceptionCpf(modal);
    optionalReceptionEmail(modal);
    refreshReceptionWarnings(modal);
    const observationLabel = Array.from(modal.querySelectorAll('small, label'))
      .find((element) => element.closest('.modal') === modal &&
        norm(element.textContent) === 'Observação');
    const observation = observationLabel?.closest('.col') || null;
    modal.querySelectorAll('.tm-recepcao-cpf-col').forEach((field) =>
      setClass(field, 'tm-recepcao-cpf-col', field === cpf));
    modal.querySelectorAll('.tm-recepcao-observacao-col').forEach((field) =>
      setClass(field, 'tm-recepcao-observacao-col', field === observation));
    if (cpf) setClass(cpf, 'tm-recepcao-cpf-col', true);
    if (observation) setClass(observation, 'tm-recepcao-observacao-col', true);
    const firstTime = !!social;
    setClass(modal, 'tm-recepcao-primeira-vez', firstTime);
    hideRedundantReceptionPatientControls(modal,
      !firstTime && Number(receptionBookingComponent(modal)?.dados?.paciente?.id_pessoa) > 0);

    if (!firstTime) {
      if (modal.classList.contains('show') || getComputedStyle(modal).display !== 'none') {
        showExistingIdentity(modal, fieldByLabel(modal, 'Celular')?.parentElement);
        alignReceptionBirth(modal);
      } else {
        modal.querySelector('.tm-recepcao-existing-identity-row')?.remove();
      }
      modal.querySelectorAll('.tm-recepcao-hidden-field').forEach((field) =>
        setClass(field, 'tm-recepcao-hidden-field', field === phone));
      modal.querySelectorAll('.tm-recepcao-dados-row').forEach((row) =>
        setClass(row, 'tm-recepcao-dados-row', false));
      modal.querySelectorAll('.tm-recepcao-contato-row').forEach((row) =>
        setClass(row, 'tm-recepcao-contato-row', false));
      return;
    }

    modal.querySelector('.tm-recepcao-existing-identity-row')?.remove();

    for (const field of [social]) {
      if (!field) continue;
      setClass(field, 'tm-recepcao-hidden-field', true);
      if (field.parentElement?.classList.contains('form-row')) {
        setClass(field.parentElement, 'tm-recepcao-dados-row', true);
      }
    }
    arrangeFirstTimeReceptionFields(modal);
    alignReceptionBirth(modal);
    protectReceptionBirthDate(modal);
  }

  function observeReceptionMutations() {
    if (!modalObserver || !observedModal?.isConnected || observationStopped) return;
    modalObserver.observe(observedModal, {
      attributes: true,
      attributeFilter: ['class', 'style'],
      childList: true,
      subtree: true
    });
  }

  function onReceptionMutations() {
    const now = performance.now();
    if (now - observationWindowStart > 1000) {
      observationWindowStart = now;
      observationCount = 0;
    }
    observationCount += 1;
    if (observationCount > 60) {
      observationStopped = true;
      modalObserver?.disconnect();
      console.warn('[TM] Ajustes da Recepção suspensos para evitar excesso de atualizações.');
      return;
    }

    // Alterações feitas por nós não entram novamente na fila do observador.
    modalObserver?.disconnect();
    try {
      applyReceptionLayout();
    } catch (error) {
      observationStopped = true;
      console.error('[TM] Ajustes da Recepção suspensos após erro.', error);
    } finally {
      observeReceptionMutations();
    }
  }

  function observeModal(modal) {
    if (modal === observedModal) return;
    modalObserver?.disconnect();
    observationStopped = false;
    observationCount = 0;
    observationWindowStart = performance.now();
    extraWasVisible = false;
    extraDefaultApplied = false;
    originWasVisible = false;
    observedModal = modal;
    if (!modal) return;
    modalObserver = new MutationObserver(onReceptionMutations);
    try {
      applyReceptionLayout();
    } catch (error) {
      observationStopped = true;
      console.error('[TM] Ajustes da Recepção suspensos após erro.', error);
    }
    observeReceptionMutations();
  }

  injectStyle();
  document.addEventListener('click', (event) => {
    const button = event.target?.closest?.('button');
    const modal = button?.closest?.(`#${MODAL_ID}`);
    if (modal && openReceptionPatientProfile(modal, event)) return;
    if (modal && (norm(button.textContent) === 'Concluir' ||
        button.closest('.tm-recepcao-concluir-section'))) {
      validateRequiredReceptionFields(modal, event);
    }
  }, true);
  document.addEventListener('submit', (event) => {
    const modal = event.target?.closest?.(`#${MODAL_ID}`);
    if (modal) validateRequiredReceptionFields(modal, event);
  }, true);
  for (const eventName of ['input', 'change']) {
    document.addEventListener(eventName, (event) => {
      if (observationStopped) return;
      const modal = event.target?.closest?.(`#${MODAL_ID}`);
      if (modal) {
        if (event.target === fieldByLabel(modal, 'CPF')?.querySelector('input')) {
          if (String(event.target.value || '').replace(/\D/g, '').length === 11) {
            lastEnteredCpf.set(modal, event.target.value);
          } else {
            lastEnteredCpf.delete(modal);
          }
        }
        refreshReceptionWarnings(modal);
      }
      if (event.target?.matches?.('input#ref-data[type="date"]')) {
        applyReceptionLayout();
      }
    }, true);
  }

  const discoveryObserver = new MutationObserver(() => {
    const modal = document.getElementById(MODAL_ID);
    if (modal !== observedModal) observeModal(modal);
  });
  discoveryObserver.observe(document.documentElement, { childList: true, subtree: true });
  observeModal(document.getElementById(MODAL_ID));
})();

/* =========================
   RECEPÇÃO - FILTRO POR TIPO DE AGENDAMENTO
========================= */
(function () {
  'use strict';

  const FILTER_ID = 'tm-recepcao-tipo-filter';
  const HOST_CLASS = 'tm-recepcao-tipo-filter-host';
  const HIDDEN_CLASS = 'tm-recepcao-tipo-filter-hidden';
  const STYLE_ID = 'tm-recepcao-tipo-filter-style';
  const CARD_SELECTOR = '.dashcard.my-2[class*="atendimento-"]';
  let selectedType = '';

  function isReceptionPage() {
    const breadcrumb = document.querySelector('.breadcrumb');
    return /\bRecepção\b/i.test(breadcrumb?.textContent || '');
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${HIDDEN_CLASS} { display: none !important; }

      .${HOST_CLASS} {
        display: flex !important;
        align-items: flex-start;
        gap: 8px;
      }

      @media (min-width: 1200px) {
        .${HOST_CLASS} {
          flex: 0 0 calc(25% + 100px) !important;
          max-width: calc(25% + 100px) !important;
        }

        .${HOST_CLASS} + .col.col-12.col-md-3 {
          flex: 0 0 calc(25% - 100px) !important;
          max-width: calc(25% - 100px) !important;
        }
      }

      @media (min-width: 768px) and (max-width: 1199.98px) {
        .${HOST_CLASS},
        .${HOST_CLASS} + .col.col-12.col-md-3 {
          flex: 0 0 50% !important;
          max-width: 50% !important;
        }
      }

      .${HOST_CLASS} > .input-group {
        flex: 1 1 300px;
        width: auto;
        max-width: 300px;
        min-width: 0;
      }

      .${HOST_CLASS} > .input-group > input#ref-data {
        min-width: 0;
      }

      #${FILTER_ID} {
        flex: 1 1 180px;
        min-width: 180px;
        max-width: none;
        height: 36px;
      }

      #${FILTER_ID} .input-group-prepend,
      #${FILTER_ID} .input-group-text,
      #${FILTER_ID} select {
        height: 36px !important;
        min-height: 36px !important;
        max-height: 36px !important;
        box-sizing: border-box !important;
      }

      #${FILTER_ID} select {
        min-width: 0;
        font-size: 1rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    `;
    document.head.appendChild(style);
  }

  function appointmentType(card) {
    const statusColumn = card.querySelector(
      ':scope > .row.py-1.px-2.align-items-center > .col.col-12.col-md-2'
    );
    const icon = statusColumn?.querySelector('.azfloat > a > i');
    if (icon?.classList.contains('fa-dot-circle')) return 'marcado';
    if (icon?.classList.contains('fa-exclamation-circle')) return 'extra';
    if (icon?.classList.contains('fa-plus-circle')) return 'demanda';
    return '';
  }

  function applyFilter() {
    document.querySelectorAll(CARD_SELECTOR).forEach((card) => {
      const hide = !!selectedType && appointmentType(card) !== selectedType;
      if (card.classList.contains(HIDDEN_CLASS) !== hide) {
        card.classList.toggle(HIDDEN_CLASS, hide);
      }
    });
    updateSectionCounters();
  }

  function updateSectionCounters() {
    const badges = document.querySelectorAll(
      '.d-flex.justify-content-between.mt-3.mb-1 > h5.mb-0 > span.badge.badge-secondary'
    );
    badges.forEach((badge) => {
      const header = badge.parentElement?.parentElement;
      const list = header?.parentElement?.querySelector(':scope > .mb-3');
      if (!list) return;
      const cards = Array.from(list.querySelectorAll(CARD_SELECTOR));
      const visibleCount = cards.filter((card) => !card.classList.contains(HIDDEN_CLASS)).length;
      const nextValue = String(visibleCount);
      if (badge.textContent.trim() !== nextValue) badge.textContent = nextValue;
    });
  }

  function clearFilter() {
    document.getElementById(FILTER_ID)?.remove();
    document.querySelectorAll(`.${HOST_CLASS}`).forEach((host) =>
      host.classList.remove(HOST_CLASS));
    document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((card) =>
      card.classList.remove(HIDDEN_CLASS));
  }

  function ensureFilter() {
    if (!isReceptionPage()) {
      clearFilter();
      return;
    }

    const dateInput = document.querySelector('input#ref-data[type="date"]');
    const dateGroup = dateInput?.closest('.input-group.mb-1');
    const host = dateGroup?.closest('.col.col-12.col-md-3');
    if (!dateGroup || !host) return;

    injectStyle();
    if (!host.classList.contains(HOST_CLASS)) host.classList.add(HOST_CLASS);

    let filter = document.getElementById(FILTER_ID);
    if (!filter) {
      filter = document.createElement('div');
      filter.id = FILTER_ID;
      filter.className = 'input-group';
      const prepend = document.createElement('div');
      prepend.className = 'input-group-prepend';
      const icon = document.createElement('span');
      icon.className = 'input-group-text';
      icon.innerHTML = '<i class="fas fa-filter"></i>';
      prepend.appendChild(icon);
      filter.appendChild(prepend);
      const select = document.createElement('select');
      select.className = 'form-control';
      select.setAttribute('aria-label', 'Filtrar agendamentos por tipo');
      for (const [value, label] of [
        ['', 'Todos...'],
        ['marcado', 'MARCADO'],
        ['extra', 'EXTRA'],
        ['demanda', 'DEMANDA ESPONTÂNEA']
      ]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      }
      select.value = selectedType;
      select.title = select.selectedOptions[0]?.textContent || '';
      select.addEventListener('change', () => {
        selectedType = select.value;
        select.title = select.selectedOptions[0]?.textContent || '';
        applyFilter();
      });
      filter.appendChild(select);
    }
    if (filter.previousElementSibling !== dateGroup || filter.parentElement !== host) {
      dateGroup.insertAdjacentElement('afterend', filter);
    }
    applyFilter();
  }

  tmRuntime.register('filtro por tipo de agendamento na Recepção', ensureFilter, ['#/recepcao']);
})();

/* =========================
   RECEPÇÃO - CALENDÁRIO COM DIAS DE ATENDIMENTO E BLOQUEIO
========================= */
let tmAppointmentCalendarCore;
(function () {
  'use strict';

  const BUTTON_ID = 'tm-recepcao-calendario-botao';
  const BUTTON_HOST_ID = 'tm-recepcao-calendario-host';
  const POPOVER_ID = 'tm-recepcao-calendario-popover';
  const STYLE_ID = 'tm-recepcao-calendario-style';
  const HIDDEN_TURNO_CLASS = 'tm-recepcao-turno-oculto';
  const monthNames = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const CACHE_MS = 120000;
  const METADATA_CACHE_MS = CACHE_MS;
  const RETAIN_MS = 15 * 60000;
  const BACKGROUND_REFRESH_MS = 90000;
  let automaticRefresh = false;
  let boundComponent = null;
  let detachContext = null;
  let mountedInput = null;
  let mountedContext = '';
  const state = { month: null, days: new Map(), loading: false, error: '', request: 0, context: '' };

  function isReceptionPage() {
    return window.location.hash === '#/recepcao' &&
      !!document.querySelector('input#ref-data[type="date"]');
  }

  function iso(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function selectedMonth() {
    const raw = document.querySelector('#ref-data')?.value || '';
    const match = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, 1, 12) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1, 12);
  }

  function receptionComponent() {
    let element = document.querySelector('#filtro-medico');
    while (element) {
      const component = element.__vue__;
      if (component && typeof component.$http?.post === 'function' &&
          component.unidade_operacao !== undefined) return component;
      element = element.parentElement;
    }
    return null;
  }

  function weekAnchor(date) {
    const cursor = new Date(`${date}T12:00:00`);
    cursor.setDate(cursor.getDate() - (cursor.getDay() + 6) % 7);
    return iso(cursor);
  }

  function calendarDates(month) {
    const first = new Date(month.getFullYear(), month.getMonth(), 1, 12);
    first.setDate(first.getDate() - first.getDay());
    return Array.from({ length: 42 }, (_, index) =>
      iso(new Date(first.getFullYear(), first.getMonth(), first.getDate() + index, 12)));
  }

  function matchesUnit(agenda, unit) {
    if (!unit) return true;
    const agendaUnit = agenda?.id_unidade_operacao ??
      agenda?.local?.centro_custo?.id_unidade_operacao;
    return agendaUnit != null && String(agendaUnit) === unit;
  }

  function minutes(value) {
    const match = String(value || '').match(/^(\d{1,2}):(\d{2})/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : null;
  }

  function blockCoversSchedule(block, appointments) {
    if (!block || [false, 0, '0'].includes(block.fl_ativo)) return false;
    const start = minutes(block.hora_inicio);
    const end = minutes(block.hora_termino);
    if (start == null || end == null) return false;
    if (start === 0 && end >= 23 * 60 + 59) return true;
    const times = appointments.map((entry) => minutes(entry.hora));
    return times.length > 0 && times.every((time) => time != null && time >= start && time <= end);
  }

  function monthKey(month, doctor, unit) {
    return doctor + '|' + unit + '|' + iso(month).slice(0, 7);
  }

  // Núcleo independente da interface. Só conserva resumos; nunca pacientes.
  function createCalendarSource({ post, busy = () => false, paused = () => false, changed = () => {}, now = Date.now }) {
    const days = new Map(), weeks = new Map(), holidays = new Map();
    const runs = new Map(), pendingDays = new Map(), pendingMetadata = new Map(), listeners = new Set();
    let activeContext = '', sequence = 0, invalidatedAt = 0, active = 0, wake = null;
    const stats = { requests: 0, queries: 0, joined: 0, cacheHits: 0 };
    const queue = [];
    const cancelled = () => Object.assign(new Error('Busca substituída.'), { cancelled: true });
    const contextKey = (doctor, unit) => String(doctor) + '|' + String(unit);
    const dayKey = (context, date) => context + '|' + date;
    function fresh(map, key) {
      const entry = map.get(key);
      if (entry && now() - entry.time < (map === days ? CACHE_MS : METADATA_CACHE_MS)) return entry.value;
      if (entry && now() - entry.time >= RETAIN_MS) map.delete(key);
      return undefined;
    }
    function retained(map, key) {
      const entry = map.get(key);
      if (!entry) return undefined;
      if (now() - entry.time < RETAIN_MS) return entry.value;
      map.delete(key);
      return undefined;
    }
    function needsDay(run, date) {
      const key = dayKey(run.context, date);
      return fresh(days, key) === undefined ||
        (run.refresh && (days.get(key)?.stamp || 0) < run.stamp);
    }
    function remember(map, key, value, stamp, limit) {
      if ((map.get(key)?.stamp || 0) > stamp) return;
      map.delete(key);
      map.set(key, { value, time: now(), stamp });
      while (map.size > limit) map.delete(map.keys().next().value);
    }
    function read(dates, doctor, unit) {
      const context = contextKey(doctor, unit), result = new Map();
      for (const date of dates) {
        const value = retained(days, dayKey(context, date));
        if (value !== undefined) result.set(date, value);
      }
      return result;
    }
    function freshCount(dates, doctor, unit) {
      const context = contextKey(doctor, unit);
      return dates.filter((date) => fresh(days, dayKey(context, date)) !== undefined).length;
    }
    function stop() {
      runs.forEach((run) => {
        run.cancelled = true;
        run.cancels.forEach((cancel) => cancel());
      });
      runs.clear();
      pendingDays.clear();
      pendingMetadata.clear();
      while (queue.length) queue.shift().reject(cancelled());
      clearTimeout(wake);
      wake = null;
      activeContext = '';
    }
    function notify(event = 'days') {
      changed(event);
      listeners.forEach((listener) => listener(event));
    }
    function promote(run, priority) {
      run.priority = Math.min(run.priority, priority);
      run.dependencies.forEach((dependency) => promote(dependency, priority));
    }
    function pump() {
      clearTimeout(wake);
      wake = null;
      queue.sort((a, b) => a.run.priority - b.run.priority);
      while (active < 2 && queue.length) {
        const job = queue[0];
        if (job.run.cancelled) { queue.shift().reject(cancelled()); continue; }
        // A seleção do médico começa imediatamente, mesmo durante a busca nativa.
        // Nessa situação e nos meses secundários usamos só uma conexão própria.
        const limit = busy(job.run.component) || job.run.priority > 0 ? 1 : 2;
        if (paused()) {
          wake = setTimeout(pump, 200);
          return;
        }
        if (active >= limit) return; // A conclusão da consulta ativa já acorda a fila.
        queue.shift();
        active++;
        Promise.resolve().then(() => {
          if (job.run.cancelled) throw cancelled();
          stats.requests++;
          stats.queries += job.q.length;
          return post(job.run.component, job.q, job.run.cancels);
        }).then((response) => {
          if (job.run.cancelled) throw cancelled();
          job.resolve(response);
        }).catch(job.reject).finally(() => { active--; pump(); });
      }
    }
    function query(run, q) {
      if (run.cancelled) return Promise.reject(cancelled());
      return new Promise((resolve, reject) => {
        queue.push({ run, q, resolve, reject });
        pump();
      });
    }
    function result(response, id) {
      const item = response?.data?.[id];
      if (item?.status !== 200 || !item.data) throw new Error('Consulta recusada: ' + id);
      return item.data;
    }
    function scheduleMap(data, unit) {
      if (!data || !data.agendas || typeof data.agendas !== 'object') {
        throw new Error('Agenda semanal incompleta.');
      }
      const map = new Map();
      Object.entries(data.agendas).forEach(([date, list]) => {
        if (!Array.isArray(list)) throw new Error('Agenda semanal inválida.');
        const matching = list.filter((agenda) => matchesUnit(agenda, unit));
        if (matching.length) map.set(date, {
          holidayAllowed: matching.some((agenda) => [true, 1, '1'].includes(agenda.fl_pode_feriado))
        });
      });
      return map;
    }
    function compact(data) {
      if (!Array.isArray(data?.agendas) || data.paginate) throw new Error('Agenda incompleta.');
      return {
        agendas: data.agendas.map((entry) => ({
          hora: entry.hora, status: entry.status,
          id_agenda: entry.id_agenda, marcacao: !!entry.marcacao
        })),
        bloqueio: data.bloqueio && {
          fl_ativo: data.bloqueio.fl_ativo,
          hora_inicio: data.bloqueio.hora_inicio, hora_termino: data.bloqueio.hora_termino
        },
        feriado: data.feriado && {
          fl_ativo: data.feriado.fl_ativo, fl_pode_agendar: data.feriado.fl_pode_agendar,
          st_descricao: data.feriado.st_descricao
        }
      };
    }
    function classify(data, schedule) {
      const appointments = data.agendas, block = data.bloqueio, holiday = data.feriado;
      const hasPatient = appointments.some((entry) => !!entry.marcacao);
      const hasFree = appointments.some((entry) => entry.status === 'livre');
      const hasRegular = appointments.some((entry) => entry.status === 'ocupado' && entry.id_agenda != null);
      const hasBlocked = appointments.some((entry) => entry.status === 'bloqueado');
      const hasBlock = !!block && ![false, 0, '0'].includes(block.fl_ativo);
      const holidayActive = !!holiday && ![false, 0, '0'].includes(holiday.fl_ativo);
      const holidayClosed = holidayActive && ![true, 1, '1'].includes(holiday.fl_pode_agendar) &&
        !schedule?.holidayAllowed;
      const usable = !holidayClosed && !blockCoversSchedule(block, appointments) && (hasFree || hasRegular);
      return {
        kind: usable ? 'attendance' : hasPatient ? 'booked' :
          holidayClosed || (!!schedule && (hasBlock || hasBlocked)) ? 'blocked' : '',
        holiday: holidayActive ? holiday.st_descricao || 'Feriado' : '',
        holidayClosed: !!holidayClosed, block: hasBlock || hasBlocked
      };
    }
    function put(run, date, data, schedule) {
      if (run.cancelled) return;
      remember(days, dayKey(run.context, date), classify(data, schedule), run.stamp, 1008);
      notify();
    }
    function holidayCandidate(date, records) {
      return records.some((holiday) => {
        if ([false, 0, '0'].includes(holiday.fl_ativo)) return false;
        const start = holiday.dt_inicio?.slice(0, 10), end = holiday.dt_termino?.slice(0, 10);
        // Um cadastro inesperado deve aumentar a conferência, não ocultar feriados.
        if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !/^\d{4}-\d{2}-\d{2}$/.test(end || '')) return true;
        if (![true, 1, '1'].includes(holiday.fl_recorrente)) return date >= start && date <= end;
        const year = Number(date.slice(0, 4));
        return [year - 1, year].some((base) => {
          const first = base + start.slice(4);
          const last = (base + (end.slice(5) < start.slice(5) ? 1 : 0)) + end.slice(4);
          return date >= first && date <= last;
        });
      });
    }
    async function metadata(run, dates) {
      const anchors = [...new Set(dates.map(weekAnchor))];
      const years = [...new Set(dates.map((date) => date.slice(0, 4)))];
      const holidayKey = (year) => run.unit + '|' + year;
      const missingWeeks = anchors.filter((date) => fresh(weeks, dayKey(run.context, date)) === undefined);
      const missingYears = years.filter((year) => fresh(holidays, holidayKey(year)) === undefined);
      const flightKey = (type, key) => type + '|' + key;
      const dependencies = [];
      const ownWeeks = missingWeeks.filter((date) => {
        const flight = pendingMetadata.get(flightKey('week', dayKey(run.context, date)));
        if (flight) { promote(flight.run, run.priority); dependencies.push(flight.promise); }
        return !flight;
      });
      const ownYears = missingYears.filter((year) => {
        const flight = pendingMetadata.get(flightKey('holiday', holidayKey(year)));
        if (flight) { promote(flight.run, run.priority); dependencies.push(flight.promise); }
        return !flight;
      });
      const q = ownWeeks.map((date, i) => ({
        name: 'medicos.agenda_semanal', id: 'week' + i,
        parms: { id_medico: Number(run.doctor), data: date }
      })).concat(ownYears.map((year, i) => ({
        name: 'agenda_feriados.index', id: 'holiday' + i, parms: { ano: Number(year), cadastro: true }
      })));
      if (q.length) {
        const response = query(run, q);
        function track(key, consume) {
          const flight = { run, promise: null };
          flight.promise = response.then(consume).finally(() => {
            if (pendingMetadata.get(key) === flight) pendingMetadata.delete(key);
          });
          pendingMetadata.set(key, flight);
          dependencies.push(flight.promise);
        }
        ownWeeks.forEach((date, i) => track(flightKey('week', dayKey(run.context, date)), (value) =>
          remember(weeks, dayKey(run.context, date), scheduleMap(result(value, 'week' + i), run.unit), run.stamp, 168)));
        ownYears.forEach((year, i) => track(flightKey('holiday', holidayKey(year)), (value) => {
          const records = result(value, 'holiday' + i);
          if (!Array.isArray(records)) throw new Error('Cadastro de feriados incompleto.');
          remember(holidays, holidayKey(year), records.map((h) => ({
            dt_inicio: h.dt_inicio, dt_termino: h.dt_termino,
            fl_recorrente: h.fl_recorrente, fl_ativo: h.fl_ativo
          })), run.stamp, 12);
        }));
      }
      const outcomes = await Promise.allSettled(dependencies);
      if (run.cancelled) throw cancelled();
      const failure = outcomes.find((item) => item.status === 'rejected');
      if (failure) throw failure.reason;
      const scheduled = new Map();
      anchors.forEach((date) => {
        const week = fresh(weeks, dayKey(run.context, date));
        if (!week) throw new Error('Agenda semanal expirada.');
        week.forEach((value, key) => scheduled.set(key, value));
      });
      const records = years.flatMap((year) => {
        const value = fresh(holidays, holidayKey(year));
        if (!value) throw new Error('Cadastro de feriados expirado.');
        return value;
      });
      return { scheduled, records };
    }
    function parms(run) {
      return { medico: Number(run.doctor), unidade_operacao: run.unit,
        group: 'none', livres: 1, status: 'T', tipo_proced: 'T', na_recepcao: true };
    }
    async function daily(run, dates, scheduled) {
      const jobs = [];
      for (let start = 0; start < dates.length; start += 7) {
        const batch = dates.slice(start, start + 7).filter((date) =>
          needsDay(run, date));
        if (!batch.length) continue;
        jobs.push(query(run, batch.map((date, i) => ({
          name: 'agendas.index', id: 'day' + i, parms: { ...parms(run), data: date }
        }))).then((response) => batch.forEach((date, i) => {
          const data = result(response, 'day' + i);
          if (data.parms?.data && data.parms.data.slice(0, 10) !== date) throw new Error('Data diária inesperada.');
          put(run, date, compact(data), scheduled.get(date));
        })));
      }
      const settled = await Promise.allSettled(jobs);
      const failure = settled.find((item) => item.status === 'rejected');
      if (failure) throw failure.reason;
    }
    async function ranges(run, chunks, meta) {
      const response = await query(run, chunks.map((dates, i) => ({
        name: 'agendas.index', id: 'range' + i,
        parms: { ...parms(run), inicio: dates[0], fim: dates[dates.length - 1] }
      })));
      const { scheduled, records } = meta;
      const exceptions = [];
      chunks.forEach((dates, i) => {
        const data = result(response, 'range' + i);
        if (!Array.isArray(data.agendas) || data.paginate) throw new Error('Período incompleto.');
        if ((data.parms?.inicio && data.parms.inicio.slice(0, 10) > dates[0]) ||
            (data.parms?.fim && data.parms.fim.slice(0, 10) < dates[dates.length - 1])) {
          throw new Error('Período limitado pelo servidor.');
        }
        const grouped = new Map(dates.map((date) => [date, []]));
        data.agendas.forEach((entry) => {
          if (!grouped.has(entry.data)) throw new Error('Data inesperada no período.');
          grouped.get(entry.data).push(entry);
        });
        dates.forEach((date) => {
          if (!needsDay(run, date)) return;
          const rows = grouped.get(date), schedule = scheduled.get(date);
          const hasFree = rows.some((entry) => entry.status === 'livre');
          const hasRegular = rows.some((entry) => entry.id_agenda != null);
          // Uma divergência entre semana e período exige a confirmação diária.
          if (holidayCandidate(date, records) ||
              rows.some((entry) => entry.bloqueio || entry.status === 'bloqueado') ||
              ((!hasFree) && (schedule || hasRegular))) {
            exceptions.push(date);
          } else {
            put(run, date, compact({ agendas: rows }), schedule);
          }
        });
        // Somente a consulta própria é descartada; nunca a resposta nativa.
        grouped.clear();
        data.agendas = null;
      });
      await daily(run, exceptions, scheduled);
    }
    function ensure(dates, doctor, unit, component, { refresh = false, priority = 0 } = {}) {
      dates = [...new Set(dates)].sort();
      doctor = String(doctor || ''); unit = String(unit || '');
      if (!doctor || !component || !dates.length) return Promise.resolve(new Map());
      const context = contextKey(doctor, unit), key = context + '|' + dates.join(',');
      if (activeContext && activeContext !== context) stop();
      activeContext = context;
      if (priority === 0) runs.forEach((run) => { run.priority = 1; });
      const existing = runs.get(key);
      if (existing) {
        stats.joined++;
        promote(existing, priority);
        pump();
        return existing.promise;
      }
      const needed = dates.filter((date) => refresh || fresh(days, dayKey(context, date)) === undefined);
      stats.cacheHits += dates.length - needed.length;
      if (!needed.length) return Promise.resolve(read(dates, doctor, unit));
      const dependencies = new Set();
      const missing = needed.filter((date) => {
        const owner = pendingDays.get(dayKey(context, date));
        if (owner) { dependencies.add(owner); promote(owner, priority); stats.joined++; }
        return !owner;
      });
      const run = { key, context, doctor, unit, component, stamp: ++sequence,
        refresh, priority, dependencies, cancelled: false, cancels: new Set(), promise: null };
      runs.set(key, run);
      missing.forEach((date) => pendingDays.set(dayKey(context, date), run));
      // As datas são reservadas antes da primeira microtarefa. Abrir o popup ou
      // pedir um mês sobreposto adere à consulta existente, sem reiniciá-la.
      const own = Promise.resolve().then(async () => {
        if (run.cancelled) throw cancelled();
        if (!missing.length) return;
        // Se feriados não forem acessíveis, usa a consulta diária já autorizada.
        // As semanas continuam obrigatórias para as exceções de feriado/expediente.
        let meta;
        try {
          meta = await metadata(run, missing);
        } catch (error) {
          if (run.cancelled) throw cancelled();
          const scheduled = new Map();
          for (const anchor of new Set(missing.map(weekAnchor))) {
            const week = fresh(weeks, dayKey(context, anchor));
            if (!week) throw error;
            week.forEach((value, date) => scheduled.set(date, value));
          }
          await daily(run, missing, scheduled);
          return read(dates, doctor, unit);
        }
        // Dias previstos (inclusive lotados/bloqueados) e feriados são lidos
        // diretamente UMA vez. O período agrega somente as lacunas: evita
        // baixar o mesmo conjunto de pacientes na busca e na conferência.
        const direct = missing.filter((date) => meta.scheduled.has(date) || holidayCandidate(date, meta.records));
        const directSet = new Set(direct);
        const chunks = [];
        for (const date of missing.filter((date) => !directSet.has(date))) {
          const last = chunks[chunks.length - 1];
          const next = last && new Date(last[last.length - 1] + 'T12:00:00');
          if (next) next.setDate(next.getDate() + 1);
          if (!last || last.length >= 14 || iso(next) !== date) chunks.push([date]);
          else last.push(date);
        }
        const jobs = [daily(run, direct, meta.scheduled)];
        for (let start = 0; start < chunks.length; start += 7) {
          jobs.push(ranges(run, chunks.slice(start, start + 7), meta));
        }
        const outcomes = await Promise.allSettled(jobs);
        if (run.cancelled) throw cancelled();
        if (outcomes.some((item) => item.status === 'rejected')) {
          const scheduled = new Map();
          for (const anchor of new Set(missing.map(weekAnchor))) {
            const week = fresh(weeks, dayKey(context, anchor));
            if (!week) throw new Error('Não foi possível conferir as agendas.');
            week.forEach((value, date) => scheduled.set(date, value));
          }
          await daily(run, missing, scheduled);
        }
      });
      run.promise = Promise.allSettled([own, ...[...dependencies].map((owner) => owner.promise)])
        .then((outcomes) => {
          if (run.cancelled) throw cancelled();
          const failure = outcomes.find((item) => item.status === 'rejected');
          // Uma falha em datas de outro mês não invalida as datas já completas deste.
          if (failure && needed.some((date) => fresh(days, dayKey(context, date)) === undefined)) throw failure.reason;
          if (outcomes[0].status === 'rejected') throw outcomes[0].reason;
          return read(dates, doctor, unit);
        }).finally(() => {
          if (runs.get(key) === run) runs.delete(key);
          missing.forEach((date) => {
            const key = dayKey(context, date);
            if (pendingDays.get(key) === run) pendingDays.delete(key);
          });
        });
      return run.promise;
    }
    function invalidate(doctor, unit) {
      stop();
      invalidatedAt = ++sequence;
      const prefix = doctor == null ? '' : contextKey(doctor, unit) + '|';
      [days, weeks].forEach((map) => {
        for (const key of map.keys()) if (key.startsWith(prefix)) map.delete(key);
      });
      holidays.clear();
      notify('invalidate');
    }
    function nativeTicket() { return ++sequence; }
    function ingestNative(queries, response, stamp = nativeTicket()) {
      if (stamp < invalidatedAt) return;
      for (const q of queries) {
        if (q.name !== 'agendas.index') continue;
        const p = q.parms || {}, data = response?.[q.id]?.data;
        // Uma busca filtrada/paginada não prova ausência de pacientes no dia.
        if (response?.[q.id]?.status !== 200 || !p.na_recepcao || !p.data || !p.medico || p.group !== 'none' ||
            !p.livres || (p.status && p.status !== 'T') || (p.turno && p.turno !== 'G') ||
            (p.tipo_proced && p.tipo_proced !== 'T') || p.search || p.especialidade ||
            p.recepcao || p.id_recepcao || p.view_status || p.id_atendimento || p.id_fila_laudo ||
            p.editados || p.agora || p.te_max || p.block_view_pacotes || p.filtro_teleatend ||
            p.procedimento || p.plano || p.paciente || p.id_paciente || p.para_marcar ||
            p.confirmacao || p.detalhe || p.recursos?.length || p.id_regiao_cd ||
            p.consultorio || p.logado || p.local ||
            (p.faixa_hora && p.faixa_hora !== 'D') || p.medicos?.length || data?.paginate ||
            (data?.parms?.data && data.parms.data.slice(0, 10) !== p.data)) continue;
        try {
          const context = contextKey(p.medico, p.unidade_operacao || '');
          const weekQuery = queries.find((item) => item.name === 'medicos.agenda_semanal' &&
            String(item.parms?.id_medico) === String(p.medico) && weekAnchor(item.parms.data) === weekAnchor(p.data));
          if (weekQuery && response[weekQuery.id]?.status === 200) {
            remember(weeks, dayKey(context, weekAnchor(p.data)),
              scheduleMap(response[weekQuery.id].data, String(p.unidade_operacao || '')), stamp, 168);
          }
          const week = fresh(weeks, dayKey(context, weekAnchor(p.data)));
          if (!week) continue;
          const value = classify(compact(data), week.get(p.data));
          remember(days, dayKey(context, p.data), value, stamp, 1008);
          notify();
        } catch (_) { /* Resposta nativa desconhecida: conserva a busca independente. */ }
      }
    }
    return { read, freshCount, ensure, stop, invalidate, ingestNative, nativeTicket, classify, holidayCandidate,
      subscribe(listener) { listeners.add(listener); return () => listeners.delete(listener); },
      diagnostics: () => ({ ...stats, active, queued: queue.length, cachedDays: days.size, running: runs.size }) };
  }

  // Uma única fila e um único cache para as duas telas. Nenhum dado de paciente é persistido.
  const source = createCalendarSource({
    busy: (component) => !!component?.$store?.state?.loading,
    paused: () => document.hidden,
    post: (component, q, cancels) => {
      const axios = component.axios || component.$http;
      const token = axios.CancelToken?.source();
      // O interceptor global do Klingo mostra qualquer mensagem de erro,
      // exceto "#BC#", usado pelo próprio sistema ao substituir uma busca.
      // Cancelar só a nossa requisição, sem modificar/silenciar erros globais.
      const cancel = () => token?.cancel('#BC#');
      cancels.add(cancel);
      return component.$http.post('aql?a=agendas.index&page=1', { q, modulo: 4 }, {
        tmAppointmentCalendar: true, timeout: 20000,
        ...(token ? { cancelToken: token.token } : {})
      }).finally(() => cancels.delete(cancel));
    }
  });

  let nativeClient = null, detachNative = null, account = null;
  function prepare(component) {
    if (!component) return;
    const nextAccount = String(component.$store?.state?.user?.id_usuario || '');
    if (account !== null && nextAccount !== account) source.invalidate();
    account = nextAccount;
    const client = component.axios || component.$http;
    if (client === nativeClient) return;
    detachNative?.();
    nativeClient = client;
    const interceptors = client?.interceptors;
    if (!interceptors?.request || !interceptors?.response) return;
    const requestId = interceptors.request.use((config) => {
      if (!config.tmAppointmentCalendar) config.tmCalendarNativeTicket = source.nativeTicket();
      return config;
    });
    const responseId = interceptors.response.use((response) => {
      try {
        if (response.config?.tmAppointmentCalendar) return response;
        const body = typeof response.config?.data === 'string'
          ? JSON.parse(response.config.data) : response.config?.data;
        if (!Array.isArray(body?.q)) return response;
        const mutated = body.q.some((q) =>
          /^(agendas|marcacoes|bloqueios|agenda_feriados|cadastro_agendas|agenda_grupos|agenda_grupo_datas|reserva_horarios)\./.test(q.name) &&
          !/\.(index|show|stats|agenda_semanal|horarios|verificar_horarios_agenda|get_doc_pre_atends|campos_customizados)$/.test(q.name) &&
          response.data?.[q.id]?.status >= 200 && response.data?.[q.id]?.status < 300);
        if (mutated) source.invalidate();
        if (Number.isFinite(response.config?.tmCalendarNativeTicket)) {
          source.ingestNative(body.q, response.data, response.config.tmCalendarNativeTicket);
        }
      } catch (_) { /* Nunca interfere no retorno/erro da requisição nativa. */ }
      return response;
    });
    detachNative = () => {
      interceptors.request.eject(requestId);
      interceptors.response.eject(responseId);
    };
  }

  // O mês solicitado começa agora; vizinhos usam uma única conexão e nunca
  // cancelam o mês que o usuário abriu. Reabrir aproveita promessas e dias já prontos.
  function createCalendarPreloader({ source, active, context, onError = () => {} }) {
    let key = '', generation = 0, timer = null, neighborTimer = null, pending = null;
    function stop() {
      generation++;
      clearTimeout(timer);
      clearTimeout(neighborTimer);
      timer = null;
      neighborTimer = null;
      key = '';
      pending = null;
    }
    function sync({ force = false, refresh = false } = {}) {
      if (!active()) return Promise.resolve();
      const current = context();
      if (!current?.component) return Promise.resolve();
      const { month, doctor, unit, component } = current;
      if (!doctor) { stop(); source.stop(); return Promise.resolve(); }
      const nextKey = monthKey(month, doctor, unit);
      if (!force && key === nextKey && pending) return pending;
      key = nextKey;
      const ticket = ++generation;
      clearTimeout(timer);
      clearTimeout(neighborTimer);
      const valid = () => ticket === generation && active();
      const armRefresh = (failed) => {
        if (!valid()) return;
        timer = setTimeout(() => {
          timer = null;
          sync({ force: true, refresh: true });
        }, failed ? 15000 : BACKGROUND_REFRESH_MS);
      };
      pending = source.ensure(calendarDates(month), doctor, unit, component, { refresh, priority: 0 });
      pending.then(() => {
        armRefresh(false);
        if (refresh) return;
        // O mês visível fica pronto primeiro. Só o próximo mês é preparado
        // quando a interface fica ociosa; os demais são consultados ao navegar.
        neighborTimer = setTimeout(() => {
          neighborTimer = null;
          if (!valid()) return;
          const adjacent = new Date(month.getFullYear(), month.getMonth() + 1, 1, 12);
          source.ensure(calendarDates(adjacent), doctor, unit, component, { priority: 1 })
            .catch((error) => { if (valid() && !error.cancelled) onError(error); });
        }, 2000);
      }, (error) => {
        if (!valid()) return;
        armRefresh(true);
        if (!error.cancelled) onError(error);
      });
      return pending;
    }
    source.subscribe((event) => {
      if (event === 'invalidate' && active()) {
        stop();
        // Não reentra no interceptor nem na limpeza do cache.
        Promise.resolve().then(() => sync());
      }
    });
    return { sync, stop };
  }

  tmAppointmentCalendarCore = { source, prepare, createCalendarSource, createCalendarPreloader, calendarDates, iso, monthNames };
  const supportedRoute = () => ['#/recepcao', '#/call-center/confirmacao'].includes(window.location.hash);
  window.addEventListener('hashchange', () => { if (!supportedRoute()) source.stop(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) source.stop(); });

  let paintFrame = null;
  source.subscribe(() => {
      if (!document.getElementById(POPOVER_ID) || paintFrame != null) return;
      paintFrame = requestAnimationFrame(() => {
        paintFrame = null;
        const component = receptionComponent();
        const doctor = document.querySelector('#filtro-medico')?.value || '';
        const unit = String(component?.unidade_operacao || '');
        if (!state.month || state.context !== doctor + '|' + unit) return;
        state.days = source.read(calendarDates(state.month), doctor, unit);
        if (state.days.size === 42 && source.freshCount(calendarDates(state.month), doctor, unit) === 42) state.loading = false;
        paintDays();
      });
  });

  function bindNative(component) {
    prepare(component);
    if (component === boundComponent) return;
    detachContext?.();
    detachContext = null;
    boundComponent = component;
    // Fallback para alterações programáticas do Vue; a seleção manual usa o evento direto.
    if (typeof component?.$watch === 'function') {
      detachContext = component.$watch(() =>
        `${component.medico || ''}|${component.unidade_operacao || ''}|${String(component.referencia || '').slice(0, 7)}`,
      () => {
        component.$nextTick(() => {
          if (boundComponent !== component || !isReceptionPage() || document.hidden) return;
          if (document.getElementById(POPOVER_ID)) loadMonth();
          else prefetchSelectedMonth();
        });
      });
    }
  }

  const preloader = createCalendarPreloader({
    source,
    active: () => isReceptionPage() && !document.hidden,
    context: () => {
      const component = receptionComponent();
      prepare(component);
      return {
        component, doctor: document.querySelector('#filtro-medico')?.value || '',
        unit: String(component?.unidade_operacao || ''),
        month: document.getElementById(POPOVER_ID) && state.month ? state.month : selectedMonth()
      };
    },
    onError: (error) => console.warn('[TM] Pré-busca do calendário:', error.message)
  });

  function prefetchSelectedMonth(force = false, refresh = false) {
    return preloader.sync({ force, refresh });
  }

  async function loadMonth() {
    if (document.hidden || !isReceptionPage()) return;
    const doctor = document.querySelector('#filtro-medico')?.value || '';
    const component = receptionComponent();
    prepare(component);
    const unit = String(component?.unidade_operacao || '');
    const dates = calendarDates(state.month), request = ++state.request;
    state.context = doctor + '|' + unit;
    state.days = source.read(dates, doctor, unit);
    state.error = '';
    state.loading = !!doctor && source.freshCount(dates, doctor, unit) !== dates.length;
    render();
    if (!doctor || !component) { preloader.sync(); state.loading = false; paintDays(); return; }
    try {
      const days = await prefetchSelectedMonth(true);
      if (request === state.request && days) state.days = days;
    } catch (error) {
      if (request === state.request && !error.cancelled) {
        state.error = 'Algumas datas não puderam ser verificadas. Reabra para tentar novamente.';
        console.warn('[TM] Calendário:', error.message);
      }
    } finally {
      if (request === state.request) { state.loading = false; paintDays(); }
    }
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #ref-data::-webkit-calendar-picker-indicator { opacity: 0; pointer-events: none; }
      .${HIDDEN_TURNO_CLASS} { display: none !important; }
      #${BUTTON_ID} { height: 100%; min-width: 42px; border-radius: 0 .25rem .25rem 0; }
      #${POPOVER_ID} { position: fixed; z-index: 1080; width: 322px; max-width: calc(100vw - 16px);
        background: #fff; color: #344054; border: 1px solid #cbd5e1; border-radius: 8px;
        box-shadow: 0 10px 28px rgba(16, 24, 40, .22); padding: 12px; font-size: 13px; }
      #${POPOVER_ID} .tm-cal-header { display: flex; align-items: center; justify-content: space-between;
        gap: 8px; margin-bottom: 9px; }
      #${POPOVER_ID} .tm-cal-header strong { text-transform: capitalize; font-size: 14px; }
      #${POPOVER_ID} button { cursor: pointer; }
      #${POPOVER_ID} .tm-cal-nav { width: 30px; height: 30px; border: 1px solid #cbd5e1;
        border-radius: 5px; background: #fff; color: #344054; }
      #${POPOVER_ID} .tm-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
      #${POPOVER_ID} .tm-cal-weekday { text-align: center; color: #667085; font-size: 11px;
        font-weight: 600; padding: 5px 0; }
      #${POPOVER_ID} .tm-cal-day { height: 34px; border: 1px solid transparent; border-radius: 5px;
        background: #f5f7fa; color: #344054; }
      #${POPOVER_ID} .tm-cal-day:hover { border-color: #007bff; }
      #${POPOVER_ID} .tm-cal-day[data-kind="attendance"] { background: #198754; color: #fff; font-weight: 700; }
      #${POPOVER_ID} .tm-cal-day[data-kind="blocked"] { background: #dc3545; color: #fff; font-weight: 700; }
      #${POPOVER_ID} .tm-cal-day[data-kind="booked"] { background: #0d6efd; color: #fff; font-weight: 700; }
      #${POPOVER_ID} .tm-cal-day[data-selected="true"] { outline: 2px solid #0d6efd; outline-offset: 1px; }
      #${POPOVER_ID} .tm-cal-day[data-kind="booked"][data-selected="true"] { outline-color: #084298; }
      #${POPOVER_ID} .tm-cal-day[data-outside="true"] { opacity: .45; }
      #${POPOVER_ID} .tm-cal-day[data-today="true"] { border: 2px solid #212529; }
      #${POPOVER_ID} .tm-cal-footer { display: flex; align-items: center;
        justify-content: flex-start; gap: 10px; margin-top: 10px; }
      #${POPOVER_ID} .tm-cal-footer button { border: 0; background: transparent;
        color: #007bff; padding: 3px 5px; font-size: 13px; margin-left: auto; }
      #${POPOVER_ID} .tm-cal-footer button:hover { text-decoration: underline; }
      #${POPOVER_ID} .tm-cal-status { color: #667085; font-size: 13px; }
    `;
    document.head.appendChild(style);
  }

  function positionPopover() {
    const popover = document.getElementById(POPOVER_ID);
    const input = document.querySelector('#ref-data');
    if (!popover || !input) return;
    const rect = input.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popover.offsetWidth - 8));
    const below = rect.bottom + 6;
    const top = below + popover.offsetHeight <= window.innerHeight - 8
      ? below : Math.max(8, rect.top - popover.offsetHeight - 6);
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  function render() {
    const popover = document.getElementById(POPOVER_ID);
    if (!popover || !state.month) return;
    popover.replaceChildren();

    const header = document.createElement('div');
    header.className = 'tm-cal-header';
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'tm-cal-nav';
    previous.dataset.action = 'previous';
    previous.setAttribute('aria-label', 'Mês anterior');
    previous.textContent = '‹';
    const title = document.createElement('strong');
    title.textContent = `${monthNames[state.month.getMonth()]} de ${state.month.getFullYear()}`;
    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'tm-cal-nav';
    next.dataset.action = 'next';
    next.setAttribute('aria-label', 'Próximo mês');
    next.textContent = '›';
    header.append(previous, title, next);
    popover.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'tm-cal-grid';
    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach((label) => {
      const weekday = document.createElement('div');
      weekday.className = 'tm-cal-weekday';
      weekday.textContent = label;
      grid.appendChild(weekday);
    });
    const selected = document.querySelector('#ref-data')?.value;
    const todayIso = iso(new Date());
    for (const dateKey of calendarDates(state.month)) {
      const detail = state.days.get(dateKey);
      const day = document.createElement('button');
      day.type = 'button';
      day.className = 'tm-cal-day';
      day.dataset.date = dateKey;
      day.dataset.kind = detail?.kind || '';
      day.dataset.today = String(dateKey === todayIso);
      if (dateKey === todayIso) day.setAttribute('aria-current', 'date');
      day.dataset.selected = String(dateKey === selected);
      day.dataset.outside = String(Number(dateKey.slice(5, 7)) !== state.month.getMonth() + 1);
      day.textContent = String(Number(dateKey.slice(8, 10)));
      day.title = dayTitle(detail);
      grid.appendChild(day);
    }
    popover.appendChild(grid);

    const footer = document.createElement('div');
    footer.className = 'tm-cal-footer';
    const message = document.createElement('span');
    message.className = 'tm-cal-status';
    footer.appendChild(message);
    const today = document.createElement('button');
    today.type = 'button';
    today.dataset.action = 'today';
    today.textContent = 'Hoje';
    footer.appendChild(today);
    popover.appendChild(footer);
    paintDays();
    positionPopover();
  }

  function dayTitle(detail) {
    if (!detail) return state.loading ? 'Data ainda em consulta' : 'Data não verificada';
    return detail.kind === 'booked' && detail.holidayClosed
        ? `Paciente marcado no feriado: ${detail.holiday}`
        : detail?.kind === 'booked' && detail?.block
        ? 'Paciente marcado apesar do bloqueio da agenda'
        : detail?.kind === 'booked'
        ? 'Paciente marcado sem horários regulares disponíveis nesta data'
        : detail?.kind === 'blocked' && detail?.holidayClosed
        ? `Feriado: ${detail.holiday}`
        : detail?.kind === 'blocked' ? 'Agenda bloqueada nesta data'
        : detail?.kind === 'attendance' && detail?.holiday
        ? `Atendimento permitido no feriado: ${detail.holiday}`
        : detail?.kind === 'attendance' && detail?.block
        ? 'Médico atende nesta data (bloqueio parcial)'
        : detail?.kind === 'attendance' ? 'Médico atende nesta data'
        : 'Sem agenda identificada nesta unidade';
  }

  function paintDays() {
    const popover = document.getElementById(POPOVER_ID);
    if (!popover) return;
    popover.querySelectorAll('button[data-date]').forEach((day) => {
      const detail = state.days.get(day.dataset.date), kind = detail?.kind || '';
      if (day.dataset.kind !== kind) day.dataset.kind = kind;
      const title = dayTitle(detail);
      if (day.title !== title) day.title = title;
      day.setAttribute('aria-label', day.dataset.date + ': ' + title);
    });
    const message = popover.querySelector('.tm-cal-status');
    const status = state.loading ? 'Buscando...' : state.error;
    if (message && message.textContent !== status) message.textContent = status;
    popover.setAttribute('aria-busy', String(state.loading));
  }

  function selectDate(date) {
    const input = document.querySelector('input#ref-data[type="date"]');
    if (!input) return;
    input.value = date;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    const component = receptionComponent();
    if (component) component.referencia = date;
    closeCalendar();
    // Atualização nativa necessária para mostrar a data, não uma invalidação
    // do mês. O interceptor aproveitará a resposta quando ela for completa.
    if (date) {
      automaticRefresh = true;
      try { document.querySelector('#refresh-button')?.click(); }
      finally { automaticRefresh = false; }
    }
  }

  function closeCalendar() {
    const popover = document.getElementById(POPOVER_ID);
    if (!popover) return;
    state.request += 1;
    popover.remove();
    prefetchSelectedMonth(true);
  }

  function openCalendar() {
    if (document.getElementById(POPOVER_ID)) {
      closeCalendar();
      return;
    }
    state.month = selectedMonth();
    const popover = document.createElement('div');
    popover.id = POPOVER_ID;
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', 'Calendário de atendimentos');
    popover.addEventListener('click', (event) => {
      // render() substitui a seta clicada; sem isto, o clique chega ao documento
      // com alvo já desconectado e é interpretado como clique fora do calendário.
      event.stopPropagation();
      if (!(event.target instanceof Element)) return;
      const action = event.target.closest('button[data-action]')?.dataset.action;
      if (action === 'today') return selectDate(iso(new Date()));
      if (action === 'previous' || action === 'next') {
        state.month = new Date(state.month.getFullYear(), state.month.getMonth() +
          (action === 'next' ? 1 : -1), 1, 12);
        loadMonth();
        return;
      }
      const date = event.target.closest('button[data-date]')?.dataset.date;
      if (date) selectDate(date);
    });
    document.body.appendChild(popover);
    loadMonth();
  }

  function ensureCalendar() {
    if (window.location.hash !== '#/recepcao') {
      preloader.stop();
      if (boundComponent || mountedInput) {
        detachContext?.();
        detachContext = null;
        boundComponent = null;
        mountedInput = null;
        mountedContext = '';
      }
      closeCalendar();
      document.getElementById(BUTTON_HOST_ID)?.remove();
      document.querySelectorAll(`.${HIDDEN_TURNO_CLASS}`).forEach((element) =>
        element.classList.remove(HIDDEN_TURNO_CLASS));
      document.getElementById(STYLE_ID)?.remove();
      return;
    }
    const input = document.querySelector('input#ref-data[type="date"]');
    const group = input?.closest('.input-group.mb-1');
    if (!group) return;
    const component = receptionComponent();
    const context = monthKey(selectedMonth(), document.querySelector('#filtro-medico')?.value || '',
      String(component?.unidade_operacao || ''));
    if (mountedInput === input && mountedContext === context &&
        boundComponent === component && document.getElementById(BUTTON_ID)?.isConnected) return;
    mountedInput = input;
    mountedContext = context;
    bindNative(component);
    injectStyle();
    const turno = input.nextElementSibling;
    if (turno?.classList.contains('input-group-append') &&
        turno.querySelector('button.dropdown-toggle') &&
        !turno.classList.contains(HIDDEN_TURNO_CLASS)) {
      turno.classList.add(HIDDEN_TURNO_CLASS);
    }
    if (component && component.turno !== 'G') {
      component.turno = 'G';
      automaticRefresh = true;
      try { document.querySelector('#refresh-button')?.click(); }
      finally { automaticRefresh = false; }
    }
    let host = document.getElementById(BUTTON_HOST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = BUTTON_HOST_ID;
      host.className = 'input-group-append';
    }
    let button = document.getElementById(BUTTON_ID);
    if (!button) {
      button = document.createElement('button');
      button.id = BUTTON_ID;
      button.type = 'button';
      button.className = 'btn btn-outline-secondary';
      button.innerHTML = '<i class="fas fa-calendar-alt" aria-hidden="true"></i>';
      button.setAttribute('aria-label', 'Abrir calendário de atendimentos');
      button.title = 'Calendário de atendimentos';
      button.addEventListener('pointerenter', () => prefetchSelectedMonth(true));
      button.addEventListener('focus', () => prefetchSelectedMonth(true));
      button.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        openCalendar();
      });
    }
    if (button.parentElement !== host) host.appendChild(button);
    if (host.parentElement !== group) group.appendChild(host);
    if (document.getElementById(POPOVER_ID) &&
        state.context !== `${document.querySelector('#filtro-medico')?.value || ''}|${String(component?.unidade_operacao || '')}`) {
      loadMonth();
    }
    if (!document.getElementById(POPOVER_ID)) prefetchSelectedMonth();
  }

  document.addEventListener('click', (event) => {
    if (!document.getElementById(POPOVER_ID)) return;
    if (!(event.target instanceof Element)) return;
    if (event.target.closest(`#${POPOVER_ID}, #${BUTTON_ID}`)) return;
    closeCalendar();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCalendar();
  });
  const onReceptionFilter = (event) => {
    if (!isReceptionPage()) return;
    if (event.target?.id === 'filtro-medico') {
      if (document.getElementById(POPOVER_ID)) loadMonth();
      else prefetchSelectedMonth();
    }
  };
  document.addEventListener('input', onReceptionFilter, true);
  document.addEventListener('change', onReceptionFilter, true);
  document.addEventListener('click', (event) => {
    if (!automaticRefresh && isReceptionPage() && event.target instanceof Element && event.target.closest('#refresh-button')) {
      const component = receptionComponent();
      source.invalidate(document.querySelector('#filtro-medico')?.value || '', String(component?.unidade_operacao || ''));
    }
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      preloader.stop();
    } else if (isReceptionPage()) {
      if (document.getElementById(POPOVER_ID)) loadMonth();
      else prefetchSelectedMonth(true);
    }
  });
  window.addEventListener('resize', positionPopover);
  window.addEventListener('scroll', positionPopover, true);
  tmRuntime.register('calendário de atendimentos da Recepção', ensureCalendar, ['#/recepcao']);
})();

/* =========================
   RECEPÇÃO E CONFIRMAÇÃO - OCULTAR PRÉVIA DE DIAS DA AGENDA
========================= */
(function () {
  'use strict';

  const HIDDEN_CLASS = 'tm-agenda-previa-oculta';
  const STYLE_ID = 'tm-agenda-previa-style';

  function hideSchedulePreview() {
    document.getElementById('tm-recepcao-agenda-resumo')?.remove();
    document.getElementById('tm-recepcao-agenda-resumo-style')?.remove();
    const route = window.location.hash;
    if (route !== '#/recepcao' && route !== '#/call-center/confirmacao') {
      document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((element) =>
        element.classList.remove(HIDDEN_CLASS));
      document.getElementById(STYLE_ID)?.remove();
      return;
    }

    const scope = route === '#/call-center/confirmacao'
      ? document.querySelector('#refresh-button')?.closest('.card.dashcard')?.parentElement
      : document;
    const source = Array.from(scope?.querySelectorAll('.card-group') || [])
      .find((group) => group.querySelector(':scope > .card > .card-body.small.p-2 a.card-link'));
    if (!source) return;

    if (!document.getElementById(STYLE_ID)) {
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `.${HIDDEN_CLASS} { display: none !important; }`;
      document.head.appendChild(style);
    }
    if (!source.classList.contains(HIDDEN_CLASS)) source.classList.add(HIDDEN_CLASS);
    if (source.previousElementSibling?.matches('hr')) {
      if (!source.previousElementSibling.classList.contains(HIDDEN_CLASS)) {
        source.previousElementSibling.classList.add(HIDDEN_CLASS);
      }
    }
  }

  tmRuntime.register('ocultar prévia da agenda na Recepção e Confirmação', hideSchedulePreview,
    ['#/recepcao', '#/call-center/confirmacao']);
})();

/* =========================
   CALL CENTER / CONFIRMAÇÃO - ADAPTADOR DO CALENDÁRIO
========================= */
const tmConfirmationCalendarAdapter = (() => {
  const ROUTE = '#/call-center/confirmacao';
  const EVENT = 'tm-confirmacao-calendar-context';
  let lastContext = '';

  function selectByPlaceholder(root, label) {
    return [...root.querySelectorAll('select')].find((select) =>
      select.options[0]?.textContent.trim() === label) || null;
  }

  function read(root = document, route = window.location.hash) {
    if (route !== ROUTE) return null;
    const refresh = root.querySelector('#refresh-button');
    const toolbar = refresh?.closest('.card.dashcard');
    const startInput = refresh?.closest('.input-group')?.querySelector('input[type="date"]');
    const endInput = [...(toolbar?.querySelectorAll('input[type="date"]') || [])]
      .find((input) => input !== startInput);
    const unitSelect = toolbar && selectByPlaceholder(toolbar, 'Unidades...');
    const doctorSelect = toolbar && selectByPlaceholder(toolbar, 'Todos os Médicos...');
    if (!toolbar || !startInput || !endInput || !unitSelect || !doctorSelect) return null;
    return {
      startInput, endInput, unitSelect, doctorSelect, refresh,
      context: {
        start: startInput.value, end: endInput.value,
        unit: unitSelect.value, doctor: doctorSelect.value
      }
    };
  }

  function sync() {
    const current = read();
    const key = current ? JSON.stringify(current.context) : '';
    if (key === lastContext) return;
    lastContext = key;
    document.dispatchEvent(new CustomEvent(EVENT, { detail: current?.context || null }));
  }

  // Publica o contexto sem alterar o intervalo mantido pelo Klingo.
  const onFilter = (event) => {
    const current = read();
    if (current && [current.startInput, current.endInput, current.unitSelect,
      current.doctorSelect].includes(event.target)) sync();
  };
  document.addEventListener('input', onFilter, true);
  document.addEventListener('change', onFilter, true);
  tmRuntime.register('contexto do calendário da Confirmação', sync, ['#/call-center/confirmacao']);
  return { read, event: EVENT };
})();

/* =========================
   CALL CENTER / CONFIRMAÇÃO - CALENDÁRIO DE ATENDIMENTOS
========================= */
(function () {
  'use strict';

  const { source, prepare, createCalendarPreloader, calendarDates, iso, monthNames } = tmAppointmentCalendarCore;
  const STYLE_ID = 'tm-confirmacao-calendario-style';
  const POPOVER_ID = 'tm-confirmacao-calendario-popover';
  const BUTTON_CLASS = 'tm-confirmacao-calendario-botao';
  const INPUT_CLASS = 'tm-confirmacao-calendario-input';
  const state = { input: null, month: null, days: new Map(), loading: false, error: '', request: 0 };
  let mounted = [null, null], contextKey = '', paintFrame = null;

  function componentFor(current) {
    let element = current?.refresh;
    while (element) {
      const component = element.__vue__;
      if (typeof component?.$http?.post === 'function') return component;
      element = element.parentElement;
    }
    return null;
  }

  source.subscribe(() => {
    if (!document.getElementById(POPOVER_ID) || paintFrame != null) return;
    paintFrame = requestAnimationFrame(() => {
      paintFrame = null;
      const current = tmConfirmationCalendarAdapter.read();
      if (!current || !state.month || state.input !== current.startInput) return;
      state.days = source.read(calendarDates(state.month), current.context.doctor, current.context.unit);
      if (source.freshCount(calendarDates(state.month), current.context.doctor, current.context.unit) === 42) state.loading = false;
      paintDays();
    });
  });

  function monthOf(value) {
    const match = String(value || '').match(/^(\d{4})-(\d{2})-\d{2}$/);
    const date = match ? new Date(Number(match[1]), Number(match[2]) - 1, 1, 12) : new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1, 12);
  }

  function requestContext(current, month) {
    return [current.context.doctor, current.context.unit, iso(month).slice(0, 7)].join('|');
  }

  const preloader = createCalendarPreloader({
    source,
    active: () => !!tmConfirmationCalendarAdapter.read() && !document.hidden,
    context: () => {
      const current = tmConfirmationCalendarAdapter.read();
      if (!current) return null;
      const component = componentFor(current);
      prepare(component);
      return {
        component, doctor: current.context.doctor, unit: current.context.unit,
        month: document.getElementById(POPOVER_ID) && state.input === current.startInput && state.month
          ? state.month : monthOf(current.context.start)
      };
    },
    onError: (error) => console.warn('[TM] Pré-busca do calendário da Confirmação:', error.message)
  });

  function stopWork() { preloader.stop(); }

  function preload(force = false) {
    return preloader.sync({ force: force === true });
  }

  function dayTitle(detail) {
    if (!detail) return state.loading ? 'Data ainda em consulta' : 'Data não verificada';
    if (detail.kind === 'booked') return 'Paciente marcado sem atendimento regular disponível';
    if (detail.kind === 'blocked') return detail.holidayClosed ? `Feriado: ${detail.holiday}` : 'Agenda bloqueada';
    if (detail.kind === 'attendance') return detail.holiday ?
      `Atendimento permitido no feriado: ${detail.holiday}` : 'Médico atende nesta data';
    return 'Sem agenda identificada nesta unidade';
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      input.${INPUT_CLASS}[type="date"]::-webkit-calendar-picker-indicator { display: none !important; }
      .${BUTTON_CLASS} { height: 100%; min-width: 42px; border-radius: 0 .25rem .25rem 0; }
      #${POPOVER_ID} { position: fixed; z-index: 1080; width: 322px; max-width: calc(100vw - 16px);
        background: #fff; color: #344054; border: 1px solid #cbd5e1; border-radius: 8px;
        box-shadow: 0 10px 28px rgba(16,24,40,.22); padding: 12px; font-size: 13px; }
      #${POPOVER_ID} .tm-cal-header { display: flex; align-items: center; justify-content: space-between;
        gap: 8px; margin-bottom: 9px; }
      #${POPOVER_ID} .tm-cal-header strong { text-transform: capitalize; font-size: 14px; }
      #${POPOVER_ID} button { cursor: pointer; }
      #${POPOVER_ID} .tm-cal-nav { width: 30px; height: 30px; border: 1px solid #cbd5e1;
        border-radius: 5px; background: #fff; color: #344054; }
      #${POPOVER_ID} .tm-cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 3px; }
      #${POPOVER_ID} .tm-cal-weekday { text-align: center; color: #667085; font-size: 11px;
        font-weight: 600; padding: 5px 0; }
      #${POPOVER_ID} .tm-cal-day { height: 34px; border: 1px solid transparent; border-radius: 5px;
        background: #f5f7fa; color: #344054; }
      #${POPOVER_ID} .tm-cal-day:hover { border-color: #007bff; }
      #${POPOVER_ID} .tm-cal-day[data-kind="attendance"] { background: #198754; color: #fff; font-weight: 700; }
      #${POPOVER_ID} .tm-cal-day[data-kind="blocked"] { background: #dc3545; color: #fff; font-weight: 700; }
      #${POPOVER_ID} .tm-cal-day[data-kind="booked"] { background: #0d6efd; color: #fff; font-weight: 700; }
      #${POPOVER_ID} .tm-cal-day[data-selected="true"] { outline: 2px solid #0d6efd; outline-offset: 1px; }
      #${POPOVER_ID} .tm-cal-day[data-outside="true"] { opacity: .45; }
      #${POPOVER_ID} .tm-cal-day[data-today="true"] { border: 2px solid #212529; }
      #${POPOVER_ID} .tm-cal-footer { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
      #${POPOVER_ID} .tm-cal-status { color: #667085; }
      #${POPOVER_ID} .tm-cal-footer button { border: 0; background: transparent; color: #007bff;
        padding: 3px 5px; font-size: 13px; margin-left: auto; }
    `;
    document.head.appendChild(style);
  }

  function positionPopover() {
    const popover = document.getElementById(POPOVER_ID), input = state.input;
    if (!popover || !input) return;
    const rect = input.getBoundingClientRect();
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - popover.offsetWidth - 8));
    const below = rect.bottom + 6;
    const top = below + popover.offsetHeight <= window.innerHeight - 8 ?
      below : Math.max(8, rect.top - popover.offsetHeight - 6);
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
  }

  function paintDays() {
    const popover = document.getElementById(POPOVER_ID);
    if (!popover) return;
    const painted = state.input === tmConfirmationCalendarAdapter.read()?.startInput;
    popover.querySelectorAll('button[data-date]').forEach((day) => {
      const detail = painted ? state.days.get(day.dataset.date) : null;
      day.dataset.kind = detail?.kind || '';
      day.title = painted ? dayTitle(detail) : 'Selecionar data';
      day.setAttribute('aria-label', day.dataset.date + ': ' + day.title);
    });
    const message = popover.querySelector('.tm-cal-status');
    if (message) message.textContent = painted ? (state.loading ? 'Buscando...' : state.error) : '';
    popover.setAttribute('aria-busy', String(painted && state.loading));
  }

  function render() {
    const popover = document.getElementById(POPOVER_ID);
    if (!popover || !state.month) return;
    popover.replaceChildren();
    const header = document.createElement('div');
    header.className = 'tm-cal-header';
    const previous = document.createElement('button'), next = document.createElement('button');
    for (const [button, action, label, icon] of [
      [previous, 'previous', 'Mês anterior', '‹'], [next, 'next', 'Próximo mês', '›']
    ]) {
      button.type = 'button'; button.className = 'tm-cal-nav'; button.dataset.action = action;
      button.setAttribute('aria-label', label); button.textContent = icon;
    }
    const title = document.createElement('strong');
    title.textContent = `${monthNames[state.month.getMonth()]} de ${state.month.getFullYear()}`;
    header.append(previous, title, next);
    popover.appendChild(header);
    const grid = document.createElement('div');
    grid.className = 'tm-cal-grid';
    ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].forEach((label) => {
      const weekday = document.createElement('div');
      weekday.className = 'tm-cal-weekday'; weekday.textContent = label; grid.appendChild(weekday);
    });
    const todayIso = iso(new Date());
    for (const dateKey of calendarDates(state.month)) {
      const day = document.createElement('button');
      day.type = 'button'; day.className = 'tm-cal-day'; day.dataset.date = dateKey;
      day.dataset.today = String(dateKey === todayIso);
      if (dateKey === todayIso) day.setAttribute('aria-current', 'date');
      day.dataset.selected = String(dateKey === state.input?.value);
      day.dataset.outside = String(Number(dateKey.slice(5, 7)) !== state.month.getMonth() + 1);
      day.textContent = String(Number(dateKey.slice(8, 10)));
      grid.appendChild(day);
    }
    popover.appendChild(grid);
    const footer = document.createElement('div');
    footer.className = 'tm-cal-footer';
    const message = document.createElement('span'); message.className = 'tm-cal-status';
    const today = document.createElement('button'); today.type = 'button';
    today.dataset.action = 'today'; today.textContent = 'Hoje';
    footer.append(message, today); popover.appendChild(footer);
    paintDays(); positionPopover();
  }

  async function loadMonth() {
    const current = tmConfirmationCalendarAdapter.read();
    if (!current || !state.month || document.hidden) return;
    const request = ++state.request, dates = calendarDates(state.month);
    if (state.input === current.endInput) {
      state.days = new Map();
      state.loading = false;
      state.error = '';
      render();
      return;
    }
    const { doctor, unit } = current.context;
    prepare(componentFor(current));
    state.days = source.read(dates, doctor, unit);
    state.error = '';
    state.loading = !!doctor && source.freshCount(dates, doctor, unit) !== dates.length;
    render();
    if (!doctor || !componentFor(current)) { preload(); state.loading = false; paintDays(); return; }
    try {
      const days = await preload(true);
      if (request === state.request && days) state.days = days;
    } catch (error) {
      if (request === state.request && !error.cancelled) {
        state.error = 'Algumas datas não puderam ser verificadas.';
        console.warn('[TM] Calendário da Confirmação:', error.message);
      }
    } finally {
      if (request === state.request) { state.loading = false; paintDays(); }
    }
  }

  function closeCalendar() {
    const popover = document.getElementById(POPOVER_ID);
    if (!popover) return;
    state.request++;
    popover.remove();
    state.input = null;
  }

  function chooseDate(date) {
    const input = state.input;
    if (!input) return;
    input.value = date;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    closeCalendar();
    tmRuntime.schedule(0);
  }

  function openCalendar(input) {
    if (document.getElementById(POPOVER_ID) && state.input === input) {
      closeCalendar(); return;
    }
    closeCalendar();
    state.input = input;
    state.month = monthOf(input.value);
    const popover = document.createElement('div');
    popover.id = POPOVER_ID;
    popover.setAttribute('role', 'dialog');
    popover.setAttribute('aria-label', input === tmConfirmationCalendarAdapter.read()?.startInput ?
      'Calendário de atendimentos' : 'Calendário da data final');
    popover.addEventListener('click', (event) => {
      event.stopPropagation();
      if (!(event.target instanceof Element)) return;
      const action = event.target.closest('button[data-action]')?.dataset.action;
      if (action === 'today') return chooseDate(iso(new Date()));
      if (action === 'previous' || action === 'next') {
        state.month = new Date(state.month.getFullYear(), state.month.getMonth() +
          (action === 'next' ? 1 : -1), 1, 12);
        loadMonth(); return;
      }
      const date = event.target.closest('button[data-date]')?.dataset.date;
      if (date) chooseDate(date);
    });
    document.body.appendChild(popover);
    loadMonth();
  }

  function ensureCalendar() {
    const current = tmConfirmationCalendarAdapter.read();
    if (!current) {
      if (mounted.some(Boolean)) {
        stopWork(); contextKey = ''; mounted = [null, null];
        closeCalendar();
        document.querySelectorAll(`.${BUTTON_CLASS}`).forEach((button) => button.parentElement?.remove());
        document.querySelectorAll(`input.${INPUT_CLASS}`).forEach((input) => input.classList.remove(INPUT_CLASS));
        document.getElementById(STYLE_ID)?.remove();
      }
      return;
    }
    injectStyle();
    [current.startInput, current.endInput].forEach((input, index) => {
      input.classList.add(INPUT_CLASS);
      if (mounted[index] === input && input.parentElement?.querySelector(`.${BUTTON_CLASS}`)) return;
      const group = input.closest('.input-group');
      if (!group) return;
      const host = document.createElement('div'); host.className = 'input-group-append';
      const button = document.createElement('button');
      button.type = 'button'; button.className = `btn btn-outline-secondary ${BUTTON_CLASS}`;
      button.innerHTML = '<i class="fas fa-calendar-alt" aria-hidden="true"></i>';
      button.setAttribute('aria-label', index ? 'Abrir calendário da data final' : 'Abrir calendário da data inicial');
      button.title = index ? 'Selecionar data final' : 'Calendário de atendimentos';
      if (!index) {
        button.addEventListener('pointerenter', preload);
        button.addEventListener('focus', preload);
      }
      button.addEventListener('click', (event) => {
        event.preventDefault(); event.stopPropagation(); openCalendar(input);
      });
      host.appendChild(button); group.appendChild(host); mounted[index] = input;
    });
    preload();
  }

  document.addEventListener(tmConfirmationCalendarAdapter.event, () => {
    const current = tmConfirmationCalendarAdapter.read();
    if (!current) return;
    const key = requestContext(current, monthOf(current.context.start));
    if (key !== contextKey) {
      contextKey = key;
      preload();
      if (document.getElementById(POPOVER_ID)) loadMonth();
    }
  });
  document.addEventListener('click', (event) => {
    if (document.getElementById(POPOVER_ID) && event.target instanceof Element &&
        !event.target.closest(`#${POPOVER_ID}, .${BUTTON_CLASS}`)) closeCalendar();
  });
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeCalendar(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stopWork();
    else if (document.getElementById(POPOVER_ID)) loadMonth();
    else preload();
  });
  document.addEventListener('click', (event) => {
    const current = tmConfirmationCalendarAdapter.read();
    if (current && event.target instanceof Element && event.target.closest('#refresh-button')) {
      source.invalidate(current.context.doctor, current.context.unit);
    }
  }, true);
  window.addEventListener('resize', positionPopover);
  window.addEventListener('scroll', positionPopover, true);
  tmRuntime.register('calendário de atendimentos da Confirmação', ensureCalendar, ['#/call-center/confirmacao']);
})();

/* =========================
   CONFIRMAÇÃO - FILTRO POR TIPO DE AGENDAMENTO
========================= */
(function () {
  'use strict';

  const FILTER_ID = 'tm-confirmacao-tipo-filter';
  const HOST_CLASS = 'tm-confirmacao-tipo-host';
  const HIDDEN_CLASS = 'tm-confirmacao-tipo-hidden';
  const STYLE_ID = 'tm-confirmacao-tipo-style';
  const CARD_SELECTOR = '.card.mb-2.dashcard, .dashcard.my-2[class*="atendimento-"]';
  const originalBadges = new Map();
  let selectedType = '';

  function isConfirmationPage() {
    return /\bConfirmação\b/i.test(document.querySelector('.breadcrumb')?.textContent || '');
  }

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .${HIDDEN_CLASS} { display: none !important; }
      .${HOST_CLASS} {
        display: flex !important;
        align-items: flex-start;
        gap: 8px;
      }
      .${HOST_CLASS} > .input-group:not(#${FILTER_ID}) {
        flex: 1 1 0;
        width: auto;
        min-width: 0;
      }
      #${FILTER_ID} {
        flex: 0 0 calc(33.333% - 8px);
        width: calc(33.333% - 8px);
        min-width: 0;
        height: 35.75px !important;
        min-height: 35.75px !important;
        max-height: 35.75px !important;
      }
      #${FILTER_ID} .input-group-prepend,
      #${FILTER_ID} .input-group-text,
      #${FILTER_ID} select {
        height: 35.75px !important;
        min-height: 35.75px !important;
        max-height: 35.75px !important;
        box-sizing: border-box !important;
      }
      #${FILTER_ID} select {
        min-width: 0;
        font-size: 1rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      @media (max-width: 575.98px) {
        .${HOST_CLASS} { flex-wrap: wrap; }
        #${FILTER_ID},
        .${HOST_CLASS} > .input-group:not(#${FILTER_ID}) {
          flex: 0 0 100%;
          width: 100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

  function filterPanel() {
    return document.querySelector('#refresh-button')?.closest('.card');
  }

  function patientGroup(panel) {
    if (!panel) return null;
    return Array.from(panel.querySelectorAll('.input-group')).find((group) =>
      Array.from(group.querySelectorAll('input, select')).some((field) =>
        /Selecionar paciente/i.test(`${field.getAttribute('placeholder') || ''} ${field.getAttribute('aria-label') || ''}`)) ||
      /Selecionar paciente/i.test(group.textContent || '')) || null;
  }

  function listCards() {
    const panel = filterPanel();
    return Array.from(document.querySelectorAll(CARD_SELECTOR)).filter((card) =>
      !card.closest('.modal') && card !== panel && !panel?.contains(card));
  }

  function appointmentType(card) {
    const icons = Array.from(card.querySelectorAll(
      'i.fa-dot-circle, i.fa-exclamation-circle, i.fa-plus-circle'
    ));
    if (!icons.length) return '';

    let icon = null;
    const time = Array.from(card.querySelectorAll('a, span, small'))
      .find((item) => /^\d{1,2}:\d{2}$/.test(item.textContent.trim()));
    if (time) {
      const box = time.getBoundingClientRect();
      const centerX = box.left + box.width / 2;
      const centerY = box.top + box.height / 2;
      const closest = icons.map((item) => {
        const rect = item.getBoundingClientRect();
        return { item, distance: Math.hypot(rect.left + rect.width / 2 - centerX,
          rect.top + rect.height / 2 - centerY) };
      }).sort((a, b) => a.distance - b.distance)[0];
      if (closest?.distance < 100) icon = closest.item;
    }
    if (!icon) icon = icons.find((item) => item.closest('.azfloat'));

    if (icon?.classList.contains('fa-dot-circle')) return 'marcado';
    if (icon?.classList.contains('fa-exclamation-circle')) return 'extra';
    if (icon?.classList.contains('fa-plus-circle')) return 'demanda';
    return '';
  }

  function updateCounters(cards) {
    if (!selectedType) {
      originalBadges.forEach(({ original }, badge) => {
        if (badge.isConnected) badge.textContent = original;
      });
      originalBadges.clear();
      return;
    }

    const panel = filterPanel();
    const badges = Array.from(document.querySelectorAll('.badge'))
      .filter((badge) => /^\d+$/.test(badge.textContent.trim()) &&
        !badge.closest(`${CARD_SELECTOR}, .modal`) &&
        panel && !panel.contains(badge) &&
        (panel.compareDocumentPosition(badge) & Node.DOCUMENT_POSITION_FOLLOWING));

    badges.forEach((badge, index) => {
      const next = badges[index + 1];
      const sectionCards = cards.filter((card) =>
        (badge.compareDocumentPosition(card) & Node.DOCUMENT_POSITION_FOLLOWING) &&
        (!next || (card.compareDocumentPosition(next) & Node.DOCUMENT_POSITION_FOLLOWING)));
      if (!sectionCards.length) return;
      let state = originalBadges.get(badge);
      if (!state) {
        state = { original: badge.textContent, filtered: null };
        originalBadges.set(badge, state);
      } else if (badge.textContent !== state.filtered) {
        state.original = badge.textContent;
      }
      state.filtered = String(sectionCards.filter((card) => !card.classList.contains(HIDDEN_CLASS)).length);
      if (badge.textContent !== state.filtered) badge.textContent = state.filtered;
    });
  }

  function applyFilter() {
    const cards = listCards();
    cards.forEach((card) => {
      const hide = !!selectedType && appointmentType(card) !== selectedType;
      card.classList.toggle(HIDDEN_CLASS, hide);
    });
    updateCounters(cards);
  }

  function clearFilter() {
    document.getElementById(FILTER_ID)?.remove();
    document.querySelectorAll(`.${HOST_CLASS}`).forEach((host) => host.classList.remove(HOST_CLASS));
    document.querySelectorAll(`.${HIDDEN_CLASS}`).forEach((card) => card.classList.remove(HIDDEN_CLASS));
    originalBadges.forEach(({ original }, badge) => {
      if (badge.isConnected) badge.textContent = original;
    });
    originalBadges.clear();
  }

  function ensureFilter() {
    if (!isConfirmationPage()) {
      clearFilter();
      return;
    }

    const group = patientGroup(filterPanel());
    const host = group?.parentElement;
    if (!group || !host) return;
    injectStyle();
    host.classList.add(HOST_CLASS);

    let filter = document.getElementById(FILTER_ID);
    if (!filter) {
      filter = document.createElement('div');
      filter.id = FILTER_ID;
      filter.className = 'input-group';
      const prepend = document.createElement('div');
      prepend.className = 'input-group-prepend';
      const icon = document.createElement('span');
      icon.className = 'input-group-text';
      icon.innerHTML = '<i class="fas fa-filter"></i>';
      prepend.appendChild(icon);
      filter.appendChild(prepend);
      const select = document.createElement('select');
      select.className = 'form-control';
      select.setAttribute('aria-label', 'Filtrar agendamentos por tipo');
      for (const [value, label] of [
        ['', 'Todos...'],
        ['marcado', 'MARCADO'],
        ['extra', 'EXTRA'],
        ['demanda', 'DEMANDA ESPONTÂNEA']
      ]) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        select.appendChild(option);
      }
      select.value = selectedType;
      select.title = select.selectedOptions[0]?.textContent || '';
      select.addEventListener('change', () => {
        selectedType = select.value;
        select.title = select.selectedOptions[0]?.textContent || '';
        applyFilter();
      });
      filter.appendChild(select);
    }
    if (filter.parentElement !== host || filter.nextElementSibling !== group) {
      host.insertBefore(filter, group);
    }
    applyFilter();
  }

  tmRuntime.register('filtro por tipo de agendamento na Confirmação', ensureFilter, ['#/call-center/confirmacao']);
})();

/* =========================
   CHAT - REMOÇÃO DO ENVIO EM MASSA
   v23.4
========================= */
(function () {
  'use strict';

  function cleanupBulkChatDom() {
    const modal = document.querySelector('#modalChat');
    if (!modal) return;

    modal.querySelectorAll(
      '.tm-chat-bulk-bar, ' +
      '.tm-chat-bulk-cell, ' +
      '.tm-chat-bulk-check, ' +
      '.tm-chat-bulk-row, ' +
      '#tm-chat-bulk-style, ' +
      '[data-tm-chat-bulk-name], ' +
      '[data-tm-chat-bulk-user-id], ' +
      '[data-tm-chat-stable-key]'
    ).forEach((el) => {
      if (el.classList?.contains('tm-chat-bulk-row')) {
        el.classList.remove('tm-chat-bulk-row');
        el.removeAttribute('data-tm-chat-bulk-name');
        el.removeAttribute('data-tm-chat-bulk-user-id');
        el.removeAttribute('data-tm-chat-stable-key');
        return;
      }

      el.remove();
    });

    modal.classList.remove('tm-chat-bulk-returning-to-list');
  }

  document.addEventListener('shown.bs.modal', (event) => {
    if (event.target?.id === 'modalChat') {
      window.setTimeout(cleanupBulkChatDom, 0);
      window.setTimeout(cleanupBulkChatDom, 150);
      window.setTimeout(cleanupBulkChatDom, 400);
    }
  }, true);

  tmRuntime.register('limpeza do chat', cleanupBulkChatDom);
})();

/* =========================
   CALCULADORA DE DATAS - BASE FINAL
   v24.0
========================= */
(function () {
  'use strict';

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function injectFinalDateCalcCss24_1() {
    if (document.getElementById('tm-datecalc-final-fix-24-1')) return;

    const style = document.createElement('style');
    style.id = 'tm-datecalc-final-fix-24-1';
    style.textContent = `
      .tm-datecalc-final-root {
        position: fixed !important;
      }

      .tm-datecalc-final-root .tm-datecalc-hoje-btn:focus-visible,
      .tm-datecalc-final-root .tm-datecalc-copy-result:focus-visible {
        outline: 2px solid #1679e8 !important;
        outline-offset: 2px !important;
      }

      .tm-datecalc-final-root input[type="number"]::-webkit-outer-spin-button,
      .tm-datecalc-final-root input[type="number"]::-webkit-inner-spin-button {
        -webkit-appearance: none !important;
        appearance: none !important;
        margin: 0 !important;
      }

      .tm-datecalc-final-root input[type="number"],
      .tm-datecalc-final-root input#tm-datecalc-days {
        appearance: textfield !important;
        -moz-appearance: textfield !important;
      }

      .tm-datecalc-result-field-final {
        display: block !important;
        width: 100% !important;
        margin-top: 13px !important;
        padding: 0 !important;
        box-sizing: border-box !important;
      }

      .tm-datecalc-result-field-final > label {
        display: block !important;
        width: 100% !important;
        margin: 0 0 6px 0 !important;
        padding: 0 !important;
        color: #6c757d !important;
        font-size: 13px !important;
        line-height: 1.2 !important;
        font-weight: 400 !important;
        text-align: left !important;
      }

      .tm-datecalc-result-field-final .tm-datecalc-result-box {
        position: relative !important;
        width: 100% !important;
        margin-top: 0 !important;
        padding: 10px 46px 10px 12px !important;
        box-sizing: border-box !important;
      }

      .tm-datecalc-result-field-final .tm-datecalc-copy-result {
        position: absolute !important;
        right: 10px !important;
        top: 50% !important;
        transform: translateY(-50%) !important;
      }

      .tm-datecalc-final-hide {
        display: none !important;
      }
    `;

    document.head.appendChild(style);
  }

  function findRoot() {
    const root = document.getElementById('tm-datecalc-panel');
    return root && !root.classList.contains('tm-datecalc-hidden') ? root : null;
  }
  function cleanupOldResultLabelNodes(root) {
    if (!root) return;

    root.querySelectorAll('.tm-datecalc-final-result-label-outside').forEach((node) => node.remove());

    root.querySelectorAll('.tm-datecalc-final-result-label, .tm-datecalc-final-result-value').forEach((node) => {
      const textValue = norm(node.innerText || node.textContent || '');

      if (node.classList.contains('tm-datecalc-final-result-label')) {
        node.remove();
        return;
      }

      if (node.classList.contains('tm-datecalc-final-result-value')) {
        const parent = node.parentElement;
        if (parent && textValue && !parent.querySelector('#tm-datecalc-result-date')) {
          parent.textContent = textValue;
        } else {
          node.remove();
        }
      }
    });
  }


  function ensureFinalStructure() {
    injectFinalDateCalcCss24_1();

    const root = findRoot();
    if (!root) return;

    root.classList.add('tm-datecalc-final-root');

    cleanupOldResultLabelNodes(root);
    root.querySelectorAll('.tm-datecalc-final-close-row, .tm-datecalc-close-btn, .tm-datecalc-close-main, .tm-datecalc-safe-close, .tm-datecalc-safe-close-row')
      .forEach((node) => node.remove());

    const prazoInput = root.querySelector('#tm-datecalc-days, input[type="number"]');
    if (prazoInput) {
      prazoInput.setAttribute('min', '0');
      prazoInput.setAttribute('step', '1');
      prazoInput.setAttribute('inputmode', 'numeric');
    }

    root.querySelectorAll('.tm-datecalc-section').forEach((section) => {
      const hasFinal = !!section.querySelector('#tm-datecalc-end, #tm-datecalc-result-days');
      const text = norm(section.innerText || section.textContent || '');

      if (hasFinal || text.includes('Data final')) {
        section.classList.add('tm-datecalc-final-hide');
        section.style.setProperty('display', 'none', 'important');
      }
    });
  }

  document.addEventListener('click', () => {
    window.setTimeout(ensureFinalStructure, 0);
    window.setTimeout(ensureFinalStructure, 60);
    window.setTimeout(ensureFinalStructure, 160);
  }, true);

  tmRuntime.register('estrutura da calculadora', ensureFinalStructure);
})();

/* =========================
   AUTORIZAÇÕES - FILTRO POR ANEXO
   v25.3
========================= */
(function () {
  'use strict';

  const FILTER_ID = 'tm-auth-attachment-filter';
  const SELECT_ID = 'tm-auth-attachment-select';
  const STYLE_ID = 'tm-auth-attachment-filter-style-25-3';
  let selectedAttachmentValue = '';
  let applyTimer = null;

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function injectAuthAttachmentStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .tm-auth-attachment-hidden {
        display: none !important;
      }

      #${FILTER_ID} .input-group,
      #${FILTER_ID} .input-group-prepend,
      #${FILTER_ID} .input-group-text,
      #${FILTER_ID} select {
        height: 35.75px !important;
        min-height: 35.75px !important;
        max-height: 35.75px !important;
        box-sizing: border-box !important;
      }

      #${FILTER_ID} select {
        min-width: 0 !important;
        padding-top: 4px !important;
        padding-bottom: 4px !important;
      }

      .tm-auth-recepcao-filter-hidden {
        display: none !important;
      }
    `;

    document.head.appendChild(style);
  }

  function isAutorizacoesTabActive() {
    const active = Array.from(document.querySelectorAll('.nav.nav-pills .nav-link.active, .nav-pills .nav-link.active'))
      .find((link) => norm(link.innerText || link.textContent || '') === 'Autorizações');

    if (active) return true;

    const breadcrumb = document.querySelector('.breadcrumb');
    return /(?:^|\/)\s*Autorizações\b/.test(norm(breadcrumb?.innerText || breadcrumb?.textContent || ''));
  }

  function getAuthFilterCardBody() {
    if (!isAutorizacoesTabActive()) return null;

    const refresh = document.querySelector('#refresh-button');
    if (!refresh) return null;

    const card = refresh.closest('.card.dashcard, .card');
    const cardBody = card?.querySelector(':scope > .card-body') || refresh.closest('.card-body');

    if (!cardBody) return null;

    const cardText = norm(cardBody.innerText || cardBody.textContent || '');
    const hasAuthFilters =
      cardText.includes('Todas as Operadoras') &&
      cardText.includes('Todos os Status Ativos') &&
      cardText.includes('Sem filtro por fila de autorização');

    return hasAuthFilters ? cardBody : null;
  }

  function getAuthListCards() {
    if (!isAutorizacoesTabActive()) return [];

    return Array.from(document.querySelectorAll('.card.mb-2.dashcard'))
      .filter((card) => {
        if (!(card instanceof HTMLElement)) return false;
        if (card.closest(`#${FILTER_ID}`)) return false;

        const text = norm(card.innerText || card.textContent || '');
        const hasAuthActions =
          text.includes('Clonar Solicitação') ||
          text.includes('Realizar Outra Marcação') ||
          !!card.querySelector('[data-original-title="Editar Solicitação de Autorização"], [title="Imprimir Solicitação"]');

        const hasDateAttachmentArea =
          !!card.querySelector('a[title*="arquivos anexados ao atendimento"], a[title*="arquivo anexado ao atendimento"]');

        return hasAuthActions || hasDateAttachmentArea;
      });
  }

  function cardHasAttendanceAttachment(card) {
    if (!card) return false;

    const links = Array.from(card.querySelectorAll('a[title*="arquivos anexados ao atendimento"], a[title*="arquivo anexado ao atendimento"]'));

    return links.some((link) => {
      const title = norm(link.getAttribute('title') || '');
      const icon = link.querySelector('i');

      if (/^0\s+arquivos?\s+anexados?\s+ao\s+atendimento/i.test(title)) return false;
      if (/\b[1-9]\d*\s+arquivos?\s+anexados?\s+ao\s+atendimento/i.test(title)) return true;

      return !!icon && icon.classList.contains('fa-paperclip') && !icon.classList.contains('fa-plus');
    });
  }

  function getCurrentAttachmentFilterValue() {
    const select = document.getElementById(SELECT_ID);
    return select ? select.value : selectedAttachmentValue;
  }

  function applyAttachmentFilter() {
    if (!isAutorizacoesTabActive()) {
      document.querySelectorAll('.tm-auth-attachment-hidden').forEach((card) => {
        card.classList.remove('tm-auth-attachment-hidden');
      });
      return;
    }

    const value = getCurrentAttachmentFilterValue();

    getAuthListCards().forEach((card) => {
      const hasAttachment = cardHasAttendanceAttachment(card);

      const shouldHide =
        value === 'com' ? !hasAttachment :
        value === 'sem' ? hasAttachment :
        false;

      card.classList.toggle('tm-auth-attachment-hidden', shouldHide);
    });
  }

  function scheduleApplyAttachmentFilter() {
    window.clearTimeout(applyTimer);
    applyTimer = window.setTimeout(applyAttachmentFilter, 80);
  }

  function createAttachmentFilterElement() {
    const col = document.createElement('div');
    col.id = FILTER_ID;
    col.className = 'col col-12 col-md-3';

    col.innerHTML = `
      <div class="form-group mb-1">
        <div class="input-group">
          <div class="input-group-prepend">
            <span class="input-group-text text-outline-secondary" data-toggle="tooltip" data-placement="top" title="Filtrar por anexo">
              <i class="fa fa-paperclip fa-fw"></i>
            </span>
          </div>
          <select id="${SELECT_ID}" class="form form-control">
            <option value="">Todos os anexos...</option>
            <option value="com">Com anexo</option>
            <option value="sem">Sem anexo</option>
          </select>
        </div>
      </div>
    `;

    const select = col.querySelector(`#${SELECT_ID}`);
    select.setAttribute('aria-label', 'Filtrar autorizações por anexo');
    select.value = selectedAttachmentValue;
    select.addEventListener('change', () => {
      selectedAttachmentValue = select.value;
      scheduleApplyAttachmentFilter();
    }, true);

    return col;
  }

  function hideRecepcaoAuthorizationFilter(cardBody) {
    if (!cardBody) return;

    Array.from(cardBody.querySelectorAll('label'))
      .filter((label) => norm(label.innerText || label.textContent || '') === 'Incluir autorizações da recepção')
      .forEach((label) => {
        const col = label.closest('.col');
        if (!col) return;

        col.classList.add('tm-auth-recepcao-filter-hidden');
      });
  }

  function ensureAttachmentFilter() {
    injectAuthAttachmentStyle();

    const cardBody = getAuthFilterCardBody();

    if (cardBody) {
      hideRecepcaoAuthorizationFilter(cardBody);
    }

    if (!cardBody) {
      const existing = document.getElementById(FILTER_ID);
      if (existing) existing.remove();
      document.querySelectorAll('.tm-auth-recepcao-filter-hidden')
        .forEach((element) => element.classList.remove('tm-auth-recepcao-filter-hidden'));
      applyAttachmentFilter();
      return;
    }

    if (document.getElementById(FILTER_ID)) {
      return;
    }

    const rows = Array.from(cardBody.querySelectorAll(':scope > .form-row'));
    let targetRow = rows.find((row) => {
      const text = norm(row.innerText || row.textContent || '');
      return text.includes('Todos...') && text.includes('Selecionar paciente') && text.includes('Sem filtro por fila de autorização');
    });

    if (!targetRow) {
      targetRow = rows[rows.length - 1] || null;
    }

    if (!targetRow) return;

    targetRow.appendChild(createAttachmentFilterElement());
    scheduleApplyAttachmentFilter();
  }

  document.addEventListener('change', (event) => {
    if (event.target && event.target.id === SELECT_ID) {
      selectedAttachmentValue = event.target.value;
      scheduleApplyAttachmentFilter();
    }
  }, true);

  document.addEventListener('click', () => {
    tmRuntime.schedule();
  }, true);

  tmRuntime.register('filtro de autorizações', () => {
    ensureAttachmentFilter();
    applyAttachmentFilter();
  }, ['#/autorizacoes']);
})();

/* =========================
   AUTORIZAÇÕES - FILTROS INICIAIS
   v26.11
========================= */
(function () {
  'use strict';

  const RETRY_DELAY = 120;
  const MAX_READY_RETRIES = 8;
  const INITIAL_REFRESH_DELAY = 80;
  let activeFilterCard = null;
  let currentFilters = null;
  let cardStateApplied = false;
  let refreshScheduledForTabEntry = false;
  let autorizaçõesTabWasActive = false;
  let readyRetries = 0;
  let retryTimer = null;
  let refreshTimer = null;

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function isAuthorizationModuleOpen() {
    const hash = String(window.location?.hash || '');

    if (hash) return /^#\/autorizacoes(?:\/|$)/i.test(hash);

    const breadcrumb = document.querySelector('.breadcrumb');
    return /(?:^|\/)\s*Autorizações\b/.test(norm(breadcrumb?.innerText || breadcrumb?.textContent || ''));
  }

  function isAutorizacoesTabActive() {
    return Array.from(document.querySelectorAll('.nav.nav-pills .nav-link.active, .nav-pills .nav-link.active'))
      .some((link) => norm(link.innerText || link.textContent || '') === 'Autorizações');
  }

  function findSelectWithOptions(container, requiredLabels) {
    return Array.from(container.querySelectorAll('select')).find((select) => {
      const labels = new Set(Array.from(select.options, (option) => norm(option.textContent)));
      return requiredLabels.every((label) => labels.has(label));
    }) || null;
  }

  function findSelectWithOptionPrefix(container, prefix) {
    return Array.from(container.querySelectorAll('select')).find((select) =>
      Array.from(select.options).some((option) => norm(option.textContent).startsWith(prefix))
    ) || null;
  }

  function getAuthorizationFilterCard() {
    if (!isAutorizacoesTabActive()) return null;

    const refreshButton = document.querySelector('#refresh-button');
    const card = refreshButton?.closest('.card.dashcard, .card');
    const cardBody = card?.querySelector(':scope > .card-body') || refreshButton?.closest('.card-body');

    if (!cardBody) return null;

    const hasPeriod = !!findSelectWithOptions(cardBody, ['Semana']);
    const hasStatus = !!findSelectWithOptions(cardBody, ['Aberto', 'Todos os Status Ativos...']);
    const hasDateKind = !!findSelectWithOptions(cardBody, ['Data de Abertura', 'Data de Agendamento']);
    const hasAuthorizationQueue = !!findSelectWithOptionPrefix(cardBody, 'Sem filtro por fila de autorização');

    return hasPeriod && hasStatus && hasDateKind && hasAuthorizationQueue ? cardBody : null;
  }

  function getCurrentIsoWeek(date = new Date()) {
    const utcDate = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = utcDate.getUTCDay() || 7;

    utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);

    const year = utcDate.getUTCFullYear();
    const yearStart = new Date(Date.UTC(year, 0, 1));
    const week = Math.ceil((((utcDate - yearStart) / 86400000) + 1) / 7);

    return `${year}-W${String(week).padStart(2, '0')}`;
  }

  function setValue(element, value) {
    if (!element || element.value === value) return false;

    const prototype = element instanceof HTMLSelectElement
      ? HTMLSelectElement.prototype
      : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;

    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }

    return true;
  }

  function notifyValueChange(element) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function selectValueForLabel(select, label) {
    const option = Array.from(select?.options || [])
      .find((item) => norm(item.textContent) === label);

    return option ? option.value : null;
  }

  function getAuthorizationControls(cardBody) {
    const period = findSelectWithOptions(cardBody, ['Semana']);
    const status = findSelectWithOptions(cardBody, ['Aberto', 'Todos os Status Ativos...']);
    const dateKind = findSelectWithOptions(cardBody, ['Data de Abertura', 'Data de Agendamento']);
    const authorizationQueue = findSelectWithOptionPrefix(cardBody, 'Sem filtro por fila de autorização');
    const range = cardBody.querySelector('input[type="week"], input[type="month"], input[type="date"]');

    return { period, status, dateKind, authorizationQueue, range };
  }

  function getAuxiliaryInputs(cardBody, range) {
    return Array.from(cardBody.querySelectorAll('input'))
      .filter((input) => input !== range && input.type !== 'hidden' && input.type !== 'button' && input.type !== 'submit' && input.type !== 'reset');
  }

  function getDefaultFilters(cardBody) {
    const { period, status, dateKind, authorizationQueue } = getAuthorizationControls(cardBody);
    const periodValue = selectValueForLabel(period, 'Semana');
    const statusValue = selectValueForLabel(status, 'Aberto');
    const dateKindValue = selectValueForLabel(dateKind, 'Data de Agendamento');
    const authorizationQueueValue = selectValueForLabel(authorizationQueue, 'Exames');

    if (periodValue === null || statusValue === null || dateKindValue === null || authorizationQueueValue === null) return null;

    return {
      period: periodValue,
      status: statusValue,
      dateKind: dateKindValue,
      authorizationQueue: authorizationQueueValue,
      range: getCurrentIsoWeek(),
      rangeType: 'week'
    };
  }

  function captureCurrentFilters(cardBody) {
    const { period, status, dateKind, authorizationQueue, range } = getAuthorizationControls(cardBody);

    if (!period || !status || !dateKind || !authorizationQueue || !range) return null;

    return {
      period: period.value,
      status: status.value,
      dateKind: dateKind.value,
      authorizationQueue: authorizationQueue.value,
      range: range.value,
      rangeType: range.type,
      selectValues: Array.from(cardBody.querySelectorAll('select'), (select) => select.value),
      inputValues: getAuxiliaryInputs(cardBody, range).map((input) => ({
        type: input.type,
        value: input.value,
        checked: input.checked
      }))
    };
  }

  function applyFilterState(cardBody, filters) {
    const { period, status, dateKind, authorizationQueue, range } = getAuthorizationControls(cardBody);

    if (!period || !status || !dateKind || !authorizationQueue || !filters) return { ready: false, changed: false };

    if (filters.status === 'tm-open-sent' &&
        !Array.from(status.options).some(option => option.value === filters.status)) {
      return { ready: false, changed: false };
    }
    const changedElements = [];
    const selects = Array.from(cardBody.querySelectorAll('select'));

    (filters.selectValues || []).forEach((value, index) => {
      const select = selects[index];
      if (select && setValue(select, value)) changedElements.push(select);
    });

    [
      [period, filters.period],
      [status, filters.status],
      [dateKind, filters.dateKind],
      [authorizationQueue, filters.authorizationQueue]
    ].forEach(([element, value]) => {
      if (setValue(element, value)) changedElements.push(element);
    });

    if ((!range || (filters.rangeType && range.type !== filters.rangeType)) && filters.range) {
      changedElements.forEach(notifyValueChange);
      return { ready: false, changed: changedElements.length > 0 };
    }

    if (range && filters.range && setValue(range, filters.range)) {
      changedElements.push(range);
    }

    const auxiliaryInputs = getAuxiliaryInputs(cardBody, range);
    (filters.inputValues || []).forEach((savedInput, index) => {
      const input = auxiliaryInputs[index];
      if (!input || input.type !== savedInput.type) return;

      if (input.type === 'checkbox' || input.type === 'radio') {
        if (input.checked !== savedInput.checked) {
          input.checked = savedInput.checked;
          changedElements.push(input);
        }
        return;
      }

      if (setValue(input, savedInput.value)) changedElements.push(input);
    });

    changedElements.forEach(notifyValueChange);
    return { ready: true, changed: changedElements.length > 0 };
  }

  function scheduleTabRefresh() {
    if (refreshScheduledForTabEntry || refreshTimer) return;

    refreshScheduledForTabEntry = true;
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;

      if (!isAuthorizationModuleOpen() || !isAutorizacoesTabActive()) return;

      const refreshButton = document.querySelector('#refresh-button');
      if (!refreshButton || refreshButton.disabled) {
        refreshScheduledForTabEntry = false;
        return;
      }

      refreshButton.click();
    }, INITIAL_REFRESH_DELAY);
  }

  function resetAuthorizationSession() {
    activeFilterCard = null;
    currentFilters = null;
    cardStateApplied = false;
    refreshScheduledForTabEntry = false;
    autorizaçõesTabWasActive = false;
    readyRetries = 0;
    window.clearTimeout(retryTimer);
    window.clearTimeout(refreshTimer);
    retryTimer = null;
    refreshTimer = null;
  }

  function ensureAuthorizationDefaults() {
    if (!isAuthorizationModuleOpen()) {
      resetAuthorizationSession();
      return;
    }

    if (!isAutorizacoesTabActive()) {
      autorizaçõesTabWasActive = false;
      refreshScheduledForTabEntry = false;
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
      return;
    }

    const cardBody = getAuthorizationFilterCard();

    if (!cardBody) {
      return;
    }

    if (!autorizaçõesTabWasActive || cardBody !== activeFilterCard) {
      activeFilterCard = cardBody;
      cardStateApplied = false;
      readyRetries = 0;
    }
    autorizaçõesTabWasActive = true;

    if (cardStateApplied) return;

    const filters = currentFilters || getDefaultFilters(cardBody);
    const result = applyFilterState(cardBody, filters);

    if (result.ready) {
      currentFilters = captureCurrentFilters(cardBody) || filters;
      cardStateApplied = true;
      window.clearTimeout(retryTimer);
      retryTimer = null;
      scheduleTabRefresh();
      return;
    }

    if (readyRetries >= MAX_READY_RETRIES || retryTimer) return;

    readyRetries += 1;
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      tmRuntime.schedule();
    }, RETRY_DELAY);
  }

  document.addEventListener('change', (event) => {
    if (!isAuthorizationModuleOpen() || !isAutorizacoesTabActive()) return;

    const cardBody = getAuthorizationFilterCard();
    if (!cardBody || !cardBody.contains(event.target)) return;

    const filters = captureCurrentFilters(cardBody);
    if (filters) currentFilters = filters;
  }, true);

  tmRuntime.register('filtros iniciais de autorizações', ensureAuthorizationDefaults, ['#/autorizacoes']);
})();

/* =========================
   VISÃO GERAL - FILTROS INICIAIS
   v26.10
========================= */
(function () {
  'use strict';

  const RETRY_DELAY = 120;
  const MAX_READY_RETRIES = 8;
  const REFRESH_DELAY = 80;
  let activeFilterCard = null;
  let cardStateApplied = false;
  let visaoGeralTabWasActive = false;
  let refreshScheduledForTabEntry = false;
  let readyRetries = 0;
  let retryTimer = null;
  let refreshTimer = null;

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function isAuthorizationModuleOpen() {
    const hash = String(window.location?.hash || '');

    if (hash) return /^#\/autorizacoes(?:\/|$)/i.test(hash);

    const breadcrumb = document.querySelector('.breadcrumb');
    return /(?:^|\/)\s*Autorizações\b/.test(norm(breadcrumb?.innerText || breadcrumb?.textContent || ''));
  }

  function isVisaoGeralTabActive() {
    return Array.from(document.querySelectorAll('.nav.nav-pills .nav-link.active, .nav-pills .nav-link.active'))
      .some((link) => norm(link.innerText || link.textContent || '') === 'Visão Geral');
  }

  function findSelectWithOptions(container, requiredLabels) {
    return Array.from(container.querySelectorAll('select')).find((select) => {
      const labels = new Set(Array.from(select.options, (option) => norm(option.textContent)));
      return requiredLabels.every((label) => labels.has(label));
    }) || null;
  }

  function selectValueForLabel(select, label) {
    const option = Array.from(select?.options || [])
      .find((item) => norm(item.textContent) === label);

    return option ? option.value : null;
  }

  function getOverviewControls(cardBody) {
    const period = findSelectWithOptions(cardBody, ['Mês Atual']);
    const dateKind = findSelectWithOptions(cardBody, ['Data de Abertura', 'Data de Agendamento']);
    const exam = Array.from(cardBody.querySelectorAll('select'))
      .find((select) => select !== period && select !== dateKind && selectValueForLabel(select, 'Exames') !== null) || null;

    return { period, dateKind, exam };
  }

  function getOverviewFilterCard() {
    if (!isVisaoGeralTabActive()) return null;

    const refreshButton = document.querySelector('#refresh-button');
    const card = refreshButton?.closest('.card.dashcard, .card');
    const cardBody = card?.querySelector(':scope > .card-body') || refreshButton?.closest('.card-body');

    if (!cardBody) return null;

    const { period, dateKind, exam } = getOverviewControls(cardBody);
    return period && dateKind && exam ? cardBody : null;
  }

  function setValue(element, value) {
    if (!element || element.value === value) return false;

    const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
    if (setter) {
      setter.call(element, value);
    } else {
      element.value = value;
    }

    return true;
  }

  function notifyValueChange(element) {
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
  }

  function applyOverviewDefaults(cardBody) {
    const { period, dateKind, exam } = getOverviewControls(cardBody);
    const values = [
      [period, selectValueForLabel(period, 'Mês Atual')],
      [dateKind, selectValueForLabel(dateKind, 'Data de Agendamento')],
      [exam, selectValueForLabel(exam, 'Exames')]
    ];

    if (values.some(([element, value]) => !element || value === null)) return false;

    const changedElements = values
      .filter(([element, value]) => setValue(element, value))
      .map(([element]) => element);

    changedElements.forEach(notifyValueChange);
    return true;
  }

  function scheduleTabRefresh() {
    if (refreshScheduledForTabEntry || refreshTimer) return;

    refreshScheduledForTabEntry = true;
    refreshTimer = window.setTimeout(() => {
      refreshTimer = null;

      if (!isAuthorizationModuleOpen() || !isVisaoGeralTabActive()) return;

      const refreshButton = document.querySelector('#refresh-button');
      if (!refreshButton || refreshButton.disabled) {
        refreshScheduledForTabEntry = false;
        return;
      }

      refreshButton.click();
    }, REFRESH_DELAY);
  }

  function resetOverviewState() {
    activeFilterCard = null;
    cardStateApplied = false;
    visaoGeralTabWasActive = false;
    refreshScheduledForTabEntry = false;
    readyRetries = 0;
    window.clearTimeout(retryTimer);
    window.clearTimeout(refreshTimer);
    retryTimer = null;
    refreshTimer = null;
  }

  function ensureOverviewDefaults() {
    if (!isAuthorizationModuleOpen()) {
      resetOverviewState();
      return;
    }

    if (!isVisaoGeralTabActive()) {
      visaoGeralTabWasActive = false;
      refreshScheduledForTabEntry = false;
      window.clearTimeout(refreshTimer);
      refreshTimer = null;
      return;
    }

    const cardBody = getOverviewFilterCard();
    if (!cardBody) {
      scheduleTabRefresh();
      return;
    }

    if (!visaoGeralTabWasActive || cardBody !== activeFilterCard) {
      activeFilterCard = cardBody;
      cardStateApplied = false;
      readyRetries = 0;
    }
    visaoGeralTabWasActive = true;

    if (cardStateApplied) {
      scheduleTabRefresh();
      return;
    }

    if (applyOverviewDefaults(cardBody)) {
      cardStateApplied = true;
      window.clearTimeout(retryTimer);
      retryTimer = null;
      scheduleTabRefresh();
      return;
    }

    if (readyRetries >= MAX_READY_RETRIES || retryTimer) return;

    readyRetries += 1;
    retryTimer = window.setTimeout(() => {
      retryTimer = null;
      tmRuntime.schedule();
    }, RETRY_DELAY);
  }

  document.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof Element)) return;

    const tab = target.closest('.nav.nav-pills .nav-link, .nav-pills .nav-link');
    if (!tab || norm(tab.innerText || tab.textContent || '') !== 'Visão Geral') return;

    activeFilterCard = null;
    cardStateApplied = false;
    visaoGeralTabWasActive = false;
    refreshScheduledForTabEntry = false;
    readyRetries = 0;
    window.clearTimeout(retryTimer);
    window.clearTimeout(refreshTimer);
    retryTimer = null;
    refreshTimer = null;

    window.setTimeout(() => tmRuntime.schedule(), 0);
    window.setTimeout(() => tmRuntime.schedule(), RETRY_DELAY);
  }, true);

  tmRuntime.register('filtros iniciais da visão geral de autorizações', ensureOverviewDefaults, ['#/autorizacoes']);
})();

/* =========================
   AUTORIZAÇÕES - MODAL COMPACTO
   v26.11
========================= */
(function () {
  'use strict';

  const STYLE_ID = 'tm-authorization-modal-compact-style';

  function injectAuthorizationModalStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      #autorizarModal.modal.show {
        align-items: center !important;
        display: flex !important;
        justify-content: center !important;
        overflow-y: auto !important;
        padding: 16px !important;
      }

      #autorizarModal .modal-dialog.modal-dialog-total {
        height: auto !important;
        margin: 0 !important;
        max-height: calc(100vh - 32px) !important;
        max-width: 1120px !important;
        min-height: 0 !important;
        width: min(1120px, 100%) !important;
      }

      #autorizarModal .modal-content.modal-content-total {
        height: auto !important;
        max-height: calc(100vh - 32px) !important;
        min-height: 0 !important;
        width: 100% !important;
      }

      #autorizarModal .modal-body {
        flex: 0 1 auto !important;
        max-height: calc(100vh - 184px) !important;
        overflow-y: auto !important;
      }

      #autorizarModal .modal-body > br {
        display: none !important;
      }

    `;

    document.head.appendChild(style);
  }

  tmRuntime.register('modal compacto de autorização', injectAuthorizationModalStyle);
})();

/* =========================
   CHAT DIRETO - ENTER ENVIA / SHIFT+ENTER QUEBRA LINHA
   v25.4
========================= */
(function () {
  'use strict';

  const pendingSends = new WeakSet();

  function norm(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function isDirectChatTextarea(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement)) return false;

    const footer = textarea.closest('.modal-footer.d-flex.flex-column');
    if (!footer) return false;

    const group = textarea.closest('.input-group');
    if (!group || !footer.contains(group)) return false;

    const sendButton = group.querySelector('.input-group-append button.btn.btn-success, .input-group-append button.btn-success');
    if (!sendButton) return false;

    const hasPlaneIcon = !!sendButton.querySelector('.fa-paper-plane, .fas.fa-paper-plane');
    if (!hasPlaneIcon) return false;

    const modalContent = textarea.closest('.modal-content');
    if (!modalContent) return false;

    const headerText = norm(modalContent.querySelector('.modal-header')?.innerText || modalContent.querySelector('.modal-header')?.textContent || '');
    const hasChatHeader = !!headerText && !/Chat$/i.test(headerText);

    return hasChatHeader;
  }

  function getSendButton(textarea) {
    const group = textarea.closest('.input-group');
    if (!group) return null;

    return group.querySelector('.input-group-append button.btn-success');
  }

  function sendDirectChatMessage(textarea) {
    const sendButton = getSendButton(textarea);
    if (!sendButton || sendButton.disabled || pendingSends.has(textarea)) return;

    const value = norm(textarea.value);
    if (!value) return;

    pendingSends.add(textarea);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    textarea.dispatchEvent(new Event('change', { bubbles: true }));

    window.setTimeout(() => {
      if (textarea.isConnected && sendButton.isConnected && !sendButton.disabled) {
        sendButton.click();
      }
      window.setTimeout(() => pendingSends.delete(textarea), 600);
    }, 0);
  }

  function bindDirectChatTextarea(textarea) {
    if (!isDirectChatTextarea(textarea)) return;
    if (textarea.dataset.tmDirectChatEnterBound === '1') return;

    textarea.dataset.tmDirectChatEnterBound = '1';

    textarea.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;

      if (event.shiftKey || event.isComposing || event.keyCode === 229 ||
          event.repeat || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      sendDirectChatMessage(textarea);
    }, true);
  }

  function scanDirectChatTextareas() {
    document.querySelectorAll('.modal-footer.d-flex.flex-column textarea.form.form-control')
      .forEach((textarea) => bindDirectChatTextarea(textarea));
  }

  document.addEventListener('focusin', (event) => {
    if (event.target instanceof HTMLTextAreaElement) {
      bindDirectChatTextarea(event.target);
    }
  }, true);

  document.addEventListener('shown.bs.modal', () => {
    window.setTimeout(scanDirectChatTextareas, 50);
    window.setTimeout(scanDirectChatTextareas, 200);
  }, true);

  tmRuntime.register('chat direto', scanDirectChatTextareas);
})();

/* =========================
   CALCULADORA DE DATAS - COR DA VALIDADE
   v25.5
========================= */
(function () {
  'use strict';

  const STYLE_ID = 'tm-datecalc-validade-color-style-25-5';

  function injectValidityColorStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .tm-datecalc-validade-vencida {
        background-color: #f8d7da !important;
        border-color: #f1aeb5 !important;
      }

      .tm-datecalc-validade-vigente {
        background-color: #d1e7dd !important;
        border-color: #a3cfbb !important;
      }
    `;

    document.head.appendChild(style);
  }

  function parseDateInput(value) {
    const iso = tmParseDateInput(value);
    if (!iso) return null;
    const [year, month, day] = iso.split('-').map(Number);
    const date = new Date(0);
    date.setFullYear(year, month - 1, day);
    date.setHours(12, 0, 0, 0);
    return date;
  }

  function addDays(date, days) {
    const result = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    result.setDate(result.getDate() + Number(days));
    return result;
  }

  function clearValidityColor(resultBox) {
    if (!resultBox) return;

    resultBox.classList.remove('tm-datecalc-validade-vencida');
    resultBox.classList.remove('tm-datecalc-validade-vigente');
  }

  function updateValidityColor(root) {
    if (!root) return;

    const startInput = root.querySelector('#tm-datecalc-start');
    const daysInput = root.querySelector('#tm-datecalc-days');
    const resultBox = root.querySelector('.tm-datecalc-result-box');

    if (!startInput || !daysInput || !resultBox) return;

    clearValidityColor(resultBox);

    const startDate = parseDateInput(startInput.value);
    const daysRaw = String(daysInput.value || '').trim();

    if (!startDate || !/^\d+$/.test(daysRaw) || !Number.isSafeInteger(Number(daysRaw))) return;

    const validityDate = addDays(startDate, Number(daysRaw));
    if (Number.isNaN(validityDate.getTime())) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    validityDate.setHours(0, 0, 0, 0);

    if (validityDate < today) {
      resultBox.classList.add('tm-datecalc-validade-vencida');
    } else {
      resultBox.classList.add('tm-datecalc-validade-vigente');
    }
  }

  function findDateCalculatorRoots() {
    const root = document.getElementById('tm-datecalc-panel');
    return root && !root.classList.contains('tm-datecalc-hidden') ? [root] : [];
  }

  function applyValidityColors() {
    injectValidityColorStyle();

    findDateCalculatorRoots().forEach(updateValidityColor);
  }

  document.addEventListener('input', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.id === 'tm-datecalc-start' || target.id === 'tm-datecalc-days') {
      window.setTimeout(applyValidityColors, 0);
      window.setTimeout(applyValidityColors, 80);
    }
  }, true);

  document.addEventListener('change', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.id === 'tm-datecalc-start' || target.id === 'tm-datecalc-days') {
      window.setTimeout(applyValidityColors, 0);
      window.setTimeout(applyValidityColors, 80);
    }
  }, true);

  document.addEventListener('click', () => {
    window.setTimeout(applyValidityColors, 120);
  }, true);

  tmRuntime.register('cor da validade', applyValidityColors);
})();

/* =========================
   CALL CENTER - SINALIZADORES POR DATA
========================= */
(function () {
  'use strict';
  const CLASS = 'tm-callcenter-day-flags', STYLE = CLASS + '-style';
  const TTL = 120000, RETRY = 15000, LIMIT = 120;
  const cache = new Map(), hosts = new Set();
  let session = '', activeKey = '', generation = 0, running = false, cancel = null;
  let client = null, interceptor = null;

  function component() {
    if (window.location.hash !== '#/call-center') return null;
    for (let el = document.getElementById('listaPacientesModal'); el; el = el.parentElement) {
      const vue = el.__vue__;
      if (vue?.$refs?.listaPac && typeof vue.listaPacientes === 'function') return vue;
    }
    return null;
  }

  // Espelha listaPacientes -> listaPac.abrir. Não usa os filtros da Recepção
  // nem amplia o conjunto de profissionais/unidades da consulta nativa.
  function queryContext(page) {
    const modal = page.$refs.listaPac;
    if (page.$store?.state?.user?.id_plano) return null; // mesma restrição nativa
    const doctors = (page.medicos || []).filter((_, i) => page.medicosSelecionados[i]);
    if (!doctors.length) return null;
    const procedures = page.procedimentos || [], selected = procedures.filter((p) => p.selected);
    let doctor = doctors.length === 1 ? doctors[0].id_pessoa : null;
    if (!doctor && procedures.length === 1 && procedures[0].medico) doctor = procedures[0].medico.id_pessoa;
    const parms = { medico: doctor, group: 'none', livres: true,
      medicos: doctors.map((d) => d.id_pessoa), confirmacao: true, detalhe: !!modal.listaproc,
      id_paciente: modal.id_paciente, cc: modal.cc, infusao: modal.infusao,
      block_filtro_regiao: modal.block_filtro_regiao };
    if (modal.listaproc && ((page.tem_medico_unico && page.marcacao_unico_profissional) || selected.length === 1)) {
      const p = selected[0];
      if (p?.procedimento) {
        parms.procedimento = p.procedimento.id_procedimento;
        parms.plano = p.plano?.id_plano;
        parms.recursos = p.procedimento_equipamentos;
        if (p.regiao_cd && p.unidade_operacao) {
          parms.id_regiao_cd = p.regiao_cd.id_regiao_cd;
          parms.unidade_operacao = p.unidade_operacao.id_unidade_operacao;
        }
      }
    } else if (modal.listaproc && selected.length) {
      const resources = new Map();
      selected.forEach((p) => (p.procedimento_equipamentos || []).forEach((r) => {
        if (!resources.has(r.id_equipamento)) resources.set(r.id_equipamento, r);
      }));
      parms.recursos = [...resources.values()];
    }
    parms.confirmacao = !parms.procedimento;
    return JSON.parse(JSON.stringify(parms));
  }

  function bookableUnits(page) {
    const byDate = new Map();
    for (const slot of Array.isArray(page.horarios) ? page.horarios : []) {
      if (slot?.status !== 'livre' || slot.bloqueado || slot.restricao) continue;
      const date = String(slot.data || '').slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
      const unitId = slot.id_unidade_operacao ?? slot.unidade_operacao?.id_unidade_operacao;
      if (unitId == null) {
        byDate.set(date, null); // sem unidade, não atribuir sinalizadores por suposição
      } else if (byDate.get(date) !== null) {
        const doctorId = slot.medico?.id_pessoa ?? slot.id_medico;
        const agendaId = slot.id_agenda ?? slot.agenda?.id_agenda;
        if (doctorId == null && agendaId == null) continue;
        if (!byDate.has(date)) byDate.set(date, new Map());
        const units = byDate.get(date), id = String(unitId);
        if (!units.has(id)) units.set(id, { doctors: new Set(), agendas: new Set() });
        if (doctorId != null) units.get(id).doctors.add(String(doctorId));
        if (agendaId != null) units.get(id).agendas.add(String(agendaId));
      }
    }
    return byDate;
  }

  function availableKey(units) {
    return units ? [...units].map(([unit, ids]) => [unit,
      [...ids.doctors].sort(), [...ids.agendas].sort()]).sort((a, b) => a[0].localeCompare(b[0])) : null;
  }

  function summarize(data, date, context, availableUnits) {
    if (!Array.isArray(data?.agendas) || data.paginate ||
        (data.parms?.data && data.parms.data.slice(0, 10) !== date)) throw new Error('Resposta incompleta');
    const doctors = new Set(context.medicos.map(String)), seen = new Set(), groups = new Map(), units = new Set();
    for (const row of data.agendas) {
      if (row.data && row.data.slice(0, 10) !== date) throw new Error('Data inesperada');
      const mark = row.marcacao;
      if (row.status === 'passado' ||
          (!doctors.has(String(row.medico?.id_pessoa)) && !doctors.has(String(mark?.id_medico)))) continue;
      const unit = mark?.unidade_operacao || row.unidade_operacao;
      const unitId = mark?.id_unidade_operacao ?? row.id_unidade_operacao ?? unit?.id_unidade_operacao;
      const available = unitId == null ? null : availableUnits.get(String(unitId));
      if (!available) continue;
      const agendaId = mark?.id_agenda ?? row.id_agenda ?? row.agenda?.id_agenda;
      const doctorId = mark?.id_medico ?? row.medico?.id_pessoa;
      if (agendaId != null && available.agendas.size) {
        if (!available.agendas.has(String(agendaId))) continue;
      } else if (doctorId == null || !available.doctors.has(String(doctorId))) continue;
      units.add(String(unitId));
      if (!mark) continue;
      const flag = mark.sinalizador_atendimento;
      if (!flag) {
        if (mark.id_sinalizador_atendimento) throw new Error('Sinalizador incompleto');
        continue;
      }
      if (!mark.id_marcacao || !flag.id_sinalizador_atendimento || !flag.st_icon) throw new Error('Sinalizador incompleto');
      if (seen.has(String(mark.id_marcacao))) continue;
      seen.add(String(mark.id_marcacao));
      const id = String(unitId), flagId = String(flag.id_sinalizador_atendimento);
      if (!groups.has(id)) groups.set(id, { id, name: unit?.st_sigla || unit?.st_nome || unit?.search || 'Unidade ' + id, flags: new Map() });
      const group = groups.get(id);
      if (!group.flags.has(flagId)) group.flags.set(flagId, {
        id: flagId, label: flag.st_sinalizador_atendimento || flag.search || 'Sinalizador',
        icon: String(flag.st_icon).split(/\s+/).filter((s) => /^fa[a-z0-9-]*$/.test(s)).join(' '),
        color: /^(primary|secondary|success|danger|warning|info|dark|muted)$/.test(flag.st_cor) ? flag.st_cor : 'primary',
        order: Number(flag.in_regra_ordem) || 0, count: 0
      });
      const item = group.flags.get(flagId);
      if (!item.icon) throw new Error('Ícone não identificado');
      item.count++;
    }
    // Somente totais e catálogo visual ficam no cache; nenhum paciente/marcação.
    return { multipleUnits: units.size > 1, groups: [...groups.values()].map((g) => ({ id: g.id, name: g.name,
      flags: [...g.flags.values()].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id))
    })).sort((a, b) => a.name.localeCompare(b.name)) };
  }

  function bindings(page) {
    const dates = Object.keys(page.exibicao || {}).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
    const byLabel = new Map();
    dates.forEach((d) => {
      const label = d.slice(8, 10) + '/' + d.slice(5, 7);
      byLabel.set(label, byLabel.has(label) ? null : d); // não confundir anos diferentes
    });
    return [...page.$el.querySelectorAll('li.list-group-item > .row > .col-md-2')].flatMap((box) => {
      const link = box.querySelector('h4 a.card-link');
      const date = link && byLabel.get(link.textContent.trim());
      return date ? [{ box, date }] : [];
    });
  }

  function stop() {
    generation++;
    cancel?.(); cancel = null;
    activeKey = '';
  }

  function listen(page) {
    const next = page.axios || page.$http;
    if (next === client) return;
    if (interceptor != null) client?.interceptors?.response?.eject(interceptor);
    client = next;
    interceptor = client?.interceptors?.response?.use((response) => {
      try {
        if (response.config?.tmDayFlags) return response;
        const body = typeof response.config?.data === 'string' ? JSON.parse(response.config.data) : response.config?.data;
        if (body?.q?.some((q) => /^(marcacoes|agendas|sinalizadores_atendimento)\./.test(q.name) &&
            !/\.(index|show|stats|horarios|verificar_horarios_agenda|campos_customizados|get_doc_pre_atends)$/.test(q.name) &&
            response.data?.[q.id]?.status >= 200 && response.data?.[q.id]?.status < 300)) {
          stop(); cache.clear(); tmRuntime.schedule(0);
        }
      } catch (_) { /* Não modifica respostas nem erros nativos. */ }
      return response;
    });
  }

  function paint(items, contextKey, availableByDate) {
    if (!document.getElementById(STYLE)) {
      const style = document.createElement('style'); style.id = STYLE;
      style.textContent = `.${CLASS}{font:inherit;font-size:12px;line-height:1.5;text-align:center;max-width:100%;cursor:default}
        .${CLASS} .tm-day-flags-line{display:flex;justify-content:center;align-items:center;flex-wrap:wrap;gap:4px 8px}
        .${CLASS} .tm-day-flag{display:inline-flex;gap:3px;align-items:center;white-space:nowrap}
        .${CLASS} .tm-day-flags-unit{font-size:10px;color:#6c757d}
        .${CLASS} .tm-day-flags-pending{color:#6c757d;font-size:11px}
        .bg-primary .${CLASS} .tm-day-flags-unit{color:inherit}`;
      document.head.appendChild(style);
    }
    for (const { box, date } of items) {
      let host = box.querySelector('.' + CLASS);
      if (!host) { host = document.createElement('div'); host.className = CLASS; box.appendChild(host); hosts.add(host); }
      const entry = cache.get(contextKey + '|' + date);
      const available = availableByDate.get(date);
      const signature = JSON.stringify([contextKey, availableKey(available),
        entry ? [entry.value, entry.error, entry.time] : 'loading']);
      if (host.dataset.signature === signature) continue;
      host.dataset.signature = signature;
      host.replaceChildren();
      host.setAttribute('aria-live', 'polite');
      host.setAttribute('aria-busy', String(!!available?.size && !entry));
      if (!available?.size) {
        const status = document.createElement('span');
        status.className = 'tm-day-flags-pending';
        status.textContent = '?';
        status.title = 'Não foi possível identificar a unidade da vaga disponível.';
        status.setAttribute('aria-label', status.title); host.appendChild(status);
        continue;
      }
      if (!entry || entry.error) {
        const status = document.createElement('span');
        status.className = 'tm-day-flags-pending';
        status.textContent = entry?.error ? '!' : '…';
        status.title = entry?.error ? 'Não foi possível consultar os sinalizadores. Nova tentativa automática.' : 'Consultando sinalizadores';
        status.setAttribute('aria-label', status.title); host.appendChild(status);
        continue;
      }
      for (const group of entry.value.groups) {
        const line = document.createElement('div'); line.className = 'tm-day-flags-line';
        const label = document.createElement('span'); label.className = 'tm-day-flags-unit';
        label.textContent = group.name.match(/^\(([^)]+)\)/)?.[1] || group.name;
        line.appendChild(label);
        for (const flag of group.flags) {
          const item = document.createElement('span'); item.className = 'tm-day-flag text-' + flag.color;
          item.title = `${group.name}: ${flag.label} — ${flag.count}`;
          item.setAttribute('aria-label', item.title);
          const icon = document.createElement('i'); icon.className = flag.icon; icon.setAttribute('aria-hidden', 'true');
          const count = document.createElement('span'); count.textContent = String(flag.count);
          item.append(icon, count); line.appendChild(item);
        }
        host.appendChild(line);
      }
    }
    for (const host of hosts) if (!host.isConnected) hosts.delete(host);
  }

  async function run(page, context, key, items, availableByDate) {
    if (running) return;
    const pending = items.filter(({ date }) => {
      if (!availableByDate.get(date)?.size) return false;
      const entry = cache.get(key + '|' + date);
      return !entry || Date.now() - entry.time >= (entry.error ? RETRY : TTL);
    });
    if (!pending.length) return;
    running = true;
    const ticket = generation;
    try {
      // Uma requisição por vez, até três datas por lote. Nunca abre modais,
      // troca filtros, aciona loading global ou impede a busca de horários.
      for (let i = 0; i < pending.length; i += 3) {
        if (ticket !== generation || document.hidden || window.location.hash !== '#/call-center') break;
        const batch = pending.slice(i, i + 3);
        const token = (page.axios || page.$http)?.CancelToken?.source();
        cancel = () => token?.cancel('#BC#');
        try {
          const response = await (page.axios || page.$http).post('/aql?a=listapaciente', {
            q: batch.map(({ date }, n) => ({ name: 'agendas.index', id: 'flags' + n, parms: { ...context, data: date } }))
          }, { tmDayFlags: true, timeout: 20000, ...(token ? { cancelToken: token.token } : {}) });
          if (ticket !== generation) break;
          batch.forEach(({ date }, n) => {
            let entry;
            try {
              const result = response.data?.['flags' + n];
              if (result?.status !== 200) throw new Error('Consulta recusada');
              entry = { value: summarize(result.data, date, context, availableByDate.get(date)), time: Date.now() };
            } catch (_) { entry = { error: true, time: Date.now() }; }
            cache.delete(key + '|' + date); cache.set(key + '|' + date, entry);
          });
        } catch (_) {
          if (ticket !== generation) break;
          batch.forEach(({ date }) => cache.set(key + '|' + date, { error: true, time: Date.now() }));
        } finally { cancel = null; }
        while (cache.size > LIMIT) cache.delete(cache.keys().next().value);
        if (ticket === generation) paint(items, key, availableByDate);
      }
    } finally {
      running = false;
      if (ticket !== generation) tmRuntime.schedule(0);
    }
  }

  function sync() {
    const page = component();
    if (!page || document.hidden) {
      if (activeKey) stop();
      if (!page) { hosts.forEach((h) => h.remove()); hosts.clear(); }
      return;
    }
    const user = String(page.$store?.state?.user?.id_usuario || '');
    if (session !== user) { stop(); cache.clear(); session = user; }
    listen(page);
    const context = queryContext(page), items = bindings(page);
    if (!context || !items.length) {
      if (activeKey) stop();
      hosts.forEach((h) => h.remove()); hosts.clear();
      return;
    }
    const availableByDate = bookableUnits(page);
    const key = JSON.stringify([context, items.map(({ date }) =>
      [date, availableKey(availableByDate.get(date))])]);
    const workKey = key + '|' + items.map((item) => item.date).join(',');
    if (activeKey !== workKey) { stop(); activeKey = workKey; }
    paint(items, key, availableByDate);
    run(page, context, key, items, availableByDate);
  }
  document.addEventListener('visibilitychange', sync);
  window.addEventListener('hashchange', sync);
  tmRuntime.register('sinalizadores por data no Call Center', sync, ['#/call-center']);
})();

/* AUTORIZAÇÕES — opção combinada de status, sem alterar os status de edição. */
(function () {
  'use strict';
  const COMBINED_STATUS = 'tm-open-sent';

  async function fetchCombinedStatusPage(axios, filters, cancelToken) {
    const size = Number(filters.size) || 100;
    const request = async (page) => {
      const response = await axios.post('/aql?a=solicitacao_autorizacoes.index', {
        q: [{ name: 'solicitacao_autorizacoes.index', id: 'lista',
          parms: { ...filters, status: '', page, size },
          configs: ['solic-aut-block-incluir-agenda-direto'] }]
      }, { cancelToken });
      const payload = response.data;
      if (payload?.lista?.status !== 200 || !Array.isArray(payload.lista.data?.data)) {
        throw new Error('Não foi possível consultar as autorizações.');
      }
      return { page: payload.lista.data, configs: payload.configs_lista };
    };
    const first = await request(1);
    const pages = [first.page.data];
    const count = Math.max(1, Number(first.page.last_page) || 1);
    let next = 2;
    const worker = async () => {
      while (next <= count) {
        const page = next++;
        pages[page - 1] = (await request(page)).page.data;
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, count - 1) }, worker));
    // Ler todas as páginas antes de filtrar preserva a ordenação do servidor.
    const rows = pages.flat().filter(row => ['0', '6'].includes(String(row.in_status)));
    const total = rows.length;
    const last = Math.max(1, Math.ceil(total / size));
    const current = Math.min(last, Math.max(1, Number(filters.page) || 1));
    const from = (current - 1) * size;
    const url = page => page ? `${first.page.path || ''}?page=${page}` : null;
    return { configs: first.configs, page: { ...first.page,
      data: rows.slice(from, from + size), total, per_page: size,
      current_page: current, last_page: last,
      from: total ? from + 1 : null, to: total ? Math.min(from + size, total) : null,
      first_page_url: url(1), last_page_url: url(last),
      prev_page_url: url(current > 1 ? current - 1 : null),
      next_page_url: url(current < last ? current + 1 : null),
      links: [ { url: url(current > 1 ? current - 1 : null), label: '&laquo; Previous', active: false },
        ...Array.from({ length: last }, (_, i) => ({ url: url(i + 1), label: String(i + 1), active: current === i + 1 })),
        { url: url(current < last ? current + 1 : null), label: 'Next &raquo;', active: false } ]
    } };
  }

  function hookAuthorizationLoad(vue) {
    if (vue.load.__tmCombinedStatus) return;
    const original = vue.load;
    let sequence = 0;
    const wrapped = function (page = null) {
      const run = ++sequence;
      if (this.filtros.status !== COMBINED_STATUS) return original.apply(this, arguments);
      if (this.montando) return;
      this.canceltoken?.cancel('#BC#');
      if (page) this.page = page;
      this.canceltoken = this.axios.CancelToken.source();
      this.$util.setCookie('sol-aut-fila', this.filtros.id_fila_autorizacao);
      this.ja_buscou = true;
      this.$store.commit('loading', true);
      return fetchCombinedStatusPage(this.axios, { ...this.filtros, pacotes: true,
        page: this.page, size: 100 }, this.canceltoken.token).then(result => {
        if (run !== sequence || this._isDestroyed || this.filtros.status !== COMBINED_STATUS) return;
        if (result.configs) this.$store.commit('setContexto', result.configs);
        this.block_incluir_direto = !!this.$store.state.contexto['solic-aut-block-incluir-agenda-direto'];
        this.page = result.page.current_page;
        this.dados = result.page;
        this.options_classes = [...new Set(result.page.data.flatMap(row => row.js_classes || []))].sort();
      }).catch(error => {
        if (run !== sequence || this.axios.isCancel?.(error)) return;
        console.error('[TM] Falha no filtro Aberto + Enviado', error);
        window.alert('Não foi possível carregar Aberto + Enviado. Atualize a listagem para tentar novamente.');
      }).finally(() => {
        if (run === sequence) this.$store.commit('loading', false);
      });
    };
    wrapped.__tmCombinedStatus = true;
    vue.load = wrapped;
  }

  function ensureCombinedStatus() {
    const active = document.querySelector('.nav-pills .nav-link.active');
    if (active?.textContent.trim() !== 'Autorizações') return;
    const card = document.getElementById('refresh-button')?.closest('.card');
    const select = Array.from(card?.querySelectorAll('select') || []).find(select => {
      const labels = Array.from(select.options, option => option.textContent.trim());
      return labels.includes('Todos os Status Ativos...') && labels.includes('Aberto') && labels.includes('Enviado');
    });
    if (!select) return;
    let vue = null;
    for (let node = select; node; node = node.parentElement) {
      if (node.__vue__?.filtros && typeof node.__vue__.load === 'function') {
        vue = node.__vue__;
        break;
      }
    }
    if (!vue) return;
    hookAuthorizationLoad(vue);
    if (!Array.from(select.options).some(option => option.value === COMBINED_STATUS)) {
      const open = Array.from(select.options).find(option => option.value === '0');
      if (!open) return;
      const option = document.createElement('option');
      option.value = COMBINED_STATUS;
      option.textContent = 'Aberto + Enviado';
      select.insertBefore(option, open);
    }
    // O Vue pode remontar o select após outro filtro mudar.
    if (vue.filtros.status === COMBINED_STATUS && select.value !== COMBINED_STATUS) {
      select.value = COMBINED_STATUS;
    }
  }

  tmRuntime.register('autorizações Aberto + Enviado', ensureCombinedStatus, ['#/autorizacoes']);
})();

/* RECEPÇÃO — status e consulta nativa da autorização vinculada ao agendamento. */
(function () {
  'use strict';
  const BATCH_SIZE = 10;
  const CACHE_TTL = 30000;
  // O Vue reaproveita cards ocupados como livres; ambos precisam passar pela limpeza.
  const CARD_SELECTOR = '.dashcard.my-2';
  const buttonBindings = new WeakMap();
  let activeState = null;

  function authorizationId(appointment) {
    const id = appointment?.id_solicitacao_autorizacao;
    return /^\d+$/.test(String(id)) && Number(id) > 0 ? String(id) : '';
  }

  function authorizationPolicy(queues) {
    // O vínculo histórico permanece no agendamento. As filas nativas podem excluir
    // sua operadora atual mesmo quando show ainda retorna a solicitação como Aberto.
    const active = queues.filter(queue => [true, 1, '1'].includes(queue.fl_ativo));
    const exclusions = active.map(queue => new Set((queue.filtros || []).filter(rule =>
      ![true, 1, '1'].includes(rule.excluido) && [false, 0, '0'].includes(rule.fl_regra) &&
      String(rule.model_type).split('\\').pop().toLowerCase() === 'operadora')
      .map(rule => String(rule.model_id))));
    // Não ocultar uma autorização que ainda pode pertencer a outra fila ativa.
    return { excludedOperators: new Set(exclusions.length
      ? [...exclusions[0]].filter(id => exclusions.every(set => set.has(id))) : []) };
  }

  async function fetchAuthorizationPolicy(axios, cancelToken) {
    const response = await axios.post('/aql?a=fila_autorizacoes.index', {
      q: [{ name: 'fila_autorizacoes.index', id: 'rules', parms: {} }]
    }, { cancelToken });
    const result = response.data?.rules;
    if (result?.status !== 200 || !Array.isArray(result.data)) throw new Error('Regras de autorização indisponíveis.');
    return authorizationPolicy(result.data);
  }

  function authorizationApplies(appointment, policy) {
    if (!policy || !authorizationId(appointment)) return false;
    const plan = appointment.plano;
    if (appointment.id_plano && plan?.id_plano && String(appointment.id_plano) !== String(plan.id_plano)) return false;
    const operator = plan?.id_operadora ?? plan?.operadora?.id_operadora;
    return !policy.excludedOperators.has(String(operator));
  }

  function nativeAuthorizationStatus(status) {
    if (!status || typeof status.msg !== 'string' || !status.msg.trim()) return null;
    const color = String(status.color || '').toLowerCase();
    return { msg: status.msg.trim(), color: ['primary', 'success', 'info', 'danger',
      'warning', 'dark', 'secondary', 'light'].includes(color) ? color : 'secondary' };
  }

  async function fetchAuthorizationStatuses(axios, ids, cancelToken) {
    const unique = [...new Set(ids)];
    const batches = [];
    for (let i = 0; i < unique.length; i += BATCH_SIZE) batches.push(unique.slice(i, i + BATCH_SIZE));
    const statuses = new Map();
    let next = 0;
    const worker = async () => {
      while (next < batches.length) {
        const batch = batches[next++];
        const q = batch.map((id, i) => ({ name: 'solicitacao_autorizacoes.show',
          id: `authorization_${i}`, parms: { id, para_agendar: true } }));
        const response = await axios.post('/aql?a=solicitacao_autorizacoes.show', { q }, { cancelToken });
        batch.forEach((id, i) => {
          const result = response.data?.[`authorization_${i}`];
          if (result?.status !== 200 || String(result.data?.id_solicitacao_autorizacao) !== id) return;
          const status = nativeAuthorizationStatus(result.data.status_solicitacao);
          if (status) statuses.set(id, status);
        });
      }
    };
    await Promise.all(Array.from({ length: Math.min(2, batches.length) }, worker));
    return statuses;
  }

  function bindAuthorizationButton(button, vue, appointment) {
    buttonBindings.set(button, { vue, appointment });
    if (button.onclick) return;
    button.onclick = event => {
      event.preventDefault();
      event.stopPropagation();
      const binding = buttonBindings.get(button);
      if (authorizationId(binding?.appointment)) binding.vue.ver_autorizacao(binding.appointment);
    };
  }

  function injectStyle() {
    if (document.getElementById('tm-reception-authorization-style')) return;
    const style = document.createElement('style');
    style.id = 'tm-reception-authorization-style';
    style.textContent = `
      .tm-reception-authorization-slot { display: flex; align-items: center; justify-content: center; }
      .tm-reception-authorization-button { border: 0; cursor: pointer; width: 100%; white-space: normal; }
      @media (min-width: 768px) {
        .tm-reception-authorization-time { flex: 0 0 8.333333% !important; max-width: 8.333333% !important; }
      }
    `;
    document.head.appendChild(style);
  }

  function receptionVue() {
    if (!/^#\/recepcao(?:\/|$)/.test(window.location.hash)) return null;
    for (let node = document.getElementById('refresh-button'); node; node = node.parentElement) {
      const vue = node.__vue__;
      if (Array.isArray(vue?.lista) && typeof vue.ver_autorizacao === 'function' && vue.$refs?.ver_autorizacao) return vue;
    }
    return null;
  }

  function renderCard(card, vue, state) {
    const row = card.querySelector(':scope > .row.py-1.px-2.align-items-center');
    const time = row?.querySelector(':scope > .col.col-12.col-md-2');
    const cell = time?.querySelector('.d-flex.flex-md-column.flex-row');
    const appointment = cell?.__vue__?.hor?.marcacao;
    const id = authorizationId(appointment);
    let slot = row?.querySelector(':scope > .tm-reception-authorization-slot');
    if (!time || !authorizationApplies(appointment, state.policy)) {
      slot?.remove();
      time?.classList.remove('tm-reception-authorization-time');
      return '';
    }
    if (!slot) {
      slot = document.createElement('div');
      slot.className = 'col col-12 col-md-1 tm-reception-authorization-slot';
      const button = document.createElement('a');
      button.href = '#';
      slot.appendChild(button);
      row.insertBefore(slot, time.nextElementSibling);
    }
    time.classList.add('tm-reception-authorization-time');
    const button = slot.firstElementChild;
    const cached = state.cache.get(id);
    const status = cached?.status || nativeAuthorizationStatus(appointment.autorizacao?.status_solicitacao);
    const text = status?.msg || (cached ? 'Ver autorização' : '...');
    const classes = `badge badge-${status?.color || 'secondary'} tm-reception-authorization-button`;
    if (button.className !== classes) button.className = classes;
    if (button.textContent !== text) button.textContent = text;
    const title = `Ver autorização: ${text}`;
    if (button.title !== title) {
      button.title = title;
      button.setAttribute('aria-label', title);
    }
    bindAuthorizationButton(button, vue, appointment);
    return !cached || Date.now() - cached.at >= CACHE_TTL ? id : '';
  }

  function ensureReceptionAuthorization() {
    const vue = receptionVue();
    if (!vue) {
      activeState?.token.cancel('Saiu da Recepção');
      activeState = null;
      return;
    }
    injectStyle();
    const account = String(vue.$store.state.user?.id_usuario || '');
    const scope = `${vue.referencia}:${vue.unidade_operacao}:${account}`;
    if (!activeState || activeState.vue !== vue || activeState.source !== vue.marcacoes || activeState.scope !== scope) {
      const policy = activeState?.account === account ? activeState.policy : null;
      activeState?.token.cancel('Listagem alterada');
      activeState = { vue, source: vue.marcacoes, scope, account, policy,
        token: vue.axios.CancelToken.source(), cache: new Map(), loading: false };
    }
    const state = activeState;
    const ids = [...new Set(Array.from(document.querySelectorAll(CARD_SELECTOR),
      card => renderCard(card, vue, state)).filter(Boolean))];
    if ((!state.policy || Date.now() - state.policy.at >= CACHE_TTL) && !state.loading) {
      state.loading = true;
      fetchAuthorizationPolicy(vue.axios, state.token.token).then(policy => {
        if (activeState === state) state.policy = { ...policy, at: Date.now() };
      }).catch(error => {
        if (activeState !== state || vue.axios.isCancel?.(error)) return;
        // Falha de permissão/rede não pode ocultar autorizações válidas nem travar a lista.
        state.policy = { ...(state.policy || authorizationPolicy([])), at: Date.now() };
        console.warn('[TM] Não foi possível consultar as regras de autorização:', error.message);
      }).finally(() => {
        state.loading = false;
        if (activeState === state) tmRuntime.schedule(0);
      });
      return;
    }
    if (!ids.length || state.loading) return;
    state.loading = true;
    fetchAuthorizationStatuses(vue.axios, ids, state.token.token).then(statuses => {
      if (activeState !== state || state.source !== vue.marcacoes) return;
      ids.forEach(id => state.cache.set(id, { status: statuses.get(id) || null, at: Date.now() }));
    }).catch(error => {
      if (activeState !== state || vue.axios.isCancel?.(error)) return;
      // A consulta da badge nunca deve bloquear o funcionamento da Recepção.
      ids.forEach(id => state.cache.set(id, { status: null, at: Date.now() }));
      console.warn('[TM] Não foi possível consultar os status de autorização', error);
    }).finally(() => {
      state.loading = false;
      if (activeState === state) tmRuntime.schedule(0);
    });
  }

  document.addEventListener('tm-reception-authorization-updated', event => {
    const id = String(event.detail?.id || '');
    if (id && activeState) {
      activeState.cache.delete(id);
      tmRuntime.schedule(0);
    }
  });

  tmRuntime.register('status de autorização na Recepção', ensureReceptionAuthorization, ['#/recepcao']);
})();

/* CABEÇALHO — incluir os cadastros Primeira Vez na busca global de pacientes. */
(function () {
  'use strict';

  function isHeaderPatientSearch(vue) {
    return vue?.service === 'pacientes.index' &&
      vue.$parent?.$options?.name === 'AutocompletePaciente' &&
      !!vue.$el?.closest('nav.navbar') &&
      typeof vue.obj2QueryString === 'function';
  }

  function patchHeaderPatientSearch(vue) {
    if (!isHeaderPatientSearch(vue) || vue.obj2QueryString.__tmHeaderFirstVisit) return;
    const original = vue.obj2QueryString;
    const wrapped = function (parameters) {
      // pacientes.index inclui cadastro_temporario no contexto do Call Center.
      // Altere apenas esse parâmetro da busca; $route e a seleção nativa continuam intactos.
      return original.call(this, isHeaderPatientSearch(this) && parameters && typeof parameters === 'object'
        ? { ...parameters, rota: '/call-center' } : parameters);
    };
    wrapped.__tmHeaderFirstVisit = true;
    vue.obj2QueryString = wrapped;

    // O autocomplete otimizado reutiliza resultados de prefixos já consultados.
    // Não deixe o cache antigo, sem temporários, alimentar a busca corrigida.
    vue.canceltoken?.cancel('#BC#');
    vue.items = [];
    vue.results = [];
    vue.searched = '';
    if (vue.isOpen && typeof vue.search === 'string' && vue.search.trim().length >= 2) {
      vue.searchAutoComplete();
    }
  }

  function ensureHeaderPatientSearch() {
    const input = document.querySelector('nav.navbar #autcomplete-paciente input');
    for (let node = input; node; node = node.parentElement) {
      if (isHeaderPatientSearch(node.__vue__)) {
        patchHeaderPatientSearch(node.__vue__);
        return;
      }
    }
  }

  tmRuntime.register('busca global de pacientes Primeira Vez', ensureHeaderPatientSearch);
})();

/* RECEPÇÃO — registrar Enviado e Em Sessão após a conclusão nativa das guias. */
(function () {
  'use strict';
  const ELIGIBLE = new Set(['0', '2', '11']);
  const completionIntents = new WeakMap();
  const firstVisits = new WeakMap();
  const pending = new Map();

  function positiveId(value) {
    return /^\d+$/.test(String(value)) && Number(value) > 0 ? String(value) : '';
  }

  async function readAppointment(axios, context) {
    const response = await axios.post('/aql?a=marcacoes.show', { q: [{ name: 'marcacoes.show',
      id: 'item', parms: { id: context.appointmentId, para_atendimento: true, guia_tiss: true } }] });
    const result = response.data?.item;
    const appointment = result?.data;
    if (result?.status !== 200 || positiveId(appointment?.id_marcacao) !== context.appointmentId ||
        positiveId(appointment?.id_atendimento) !== context.attendanceId ||
        positiveId(appointment?.id_solicitacao_autorizacao) !== context.authorizationId ||
        positiveId(appointment?.atendimento?.id_atendimento) !== context.attendanceId) {
      throw new Error('O vínculo entre agendamento, atendimento e autorização mudou.');
    }
    return appointment;
  }

  async function readAuthorization(axios, id) {
    const response = await axios.post('/aql?a=solicitacao_autorizacoes.index', {
      q: [{ name: 'solicitacao_autorizacoes.index', id: 'lista',
        parms: { id_solicitacao_autorizacao: id, autorizar: true } }]
    });
    const result = response.data?.lista;
    if (result?.status !== 200 || !Array.isArray(result.data) || result.data.length !== 1 ||
        positiveId(result.data[0]?.id_solicitacao_autorizacao) !== id) {
      throw new Error('Não foi possível consultar a autorização para atualização.');
    }
    if (result.data[0].js_secundarios != null && !Array.isArray(result.data[0].js_secundarios)) {
      throw new Error('Formato dos procedimentos secundários não reconhecido.');
    }
    return result.data[0];
  }

  function authorizationItems(record, ids) {
    const selected = new Set(ids);
    const items = [record, ...(record.js_secundarios || [])]
      .filter(item => selected.has(positiveId(item.id_procedimento)));
    const seen = new Set();
    items.forEach(item => {
      const id = positiveId(item.id_procedimento);
      if (seen.has(id)) throw new Error('Há itens repetidos; não é possível associar o procedimento com segurança.');
      seen.add(id);
    });
    return items;
  }

  function statusDraft(record, ids, status, expected) {
    const draft = JSON.parse(JSON.stringify(record));
    const items = authorizationItems(draft, ids);
    if (items.length !== ids.length || items.some(item => !expected.has(String(item.in_status)))) {
      throw new Error('O status de um procedimento mudou durante a atualização.');
    }
    items.forEach(item => { item.in_status = status; });
    return draft;
  }

  async function storeAuthorization(axios, draft) {
    const response = await axios.post('/aql?a=solicitacao_autorizacoes.store', {
      q: [{ name: 'solicitacao_autorizacoes.store', id: 'atualizar', parms: draft }]
    });
    if (![200, 290].includes(response.data?.atualizar?.status)) {
      throw new Error('O Klingo não confirmou a gravação do status da autorização.');
    }
  }

  function hasRecordedSend(record) {
    return /^\d{4}-\d{2}-\d{2}/.test(record.dt_envio || '') &&
      !String(record.dt_envio).startsWith('0000-') && !!positiveId(record.id_usuario_envio);
  }

  async function registerSend(axios, record) {
    const response = await axios.post('/aql?a=solicitacao_autorizacoes.marcar_envio', {
      q: [{ name: 'solicitacao_autorizacoes.marcar_envio', id: 'atualizar', parms: {
        id_solicitacao_autorizacao: record.id_solicitacao_autorizacao,
        st_observacao_envio: record.st_observacao_envio, envio: true
      } }]
    });
    if (![200, 290].includes(response.data?.atualizar?.status)) {
      throw new Error('O Klingo não confirmou o registro nativo do envio.');
    }
  }

  async function transitionAuthorization(axios, context, options = {}) {
    let sentStored = false, sessionStored = false;
    try {
      const appointment = await readAppointment(axios, context);
      const procedures = appointment.atendimento.atendimento_procedimentos;
      if (!Array.isArray(procedures)) throw new Error('Não foi possível identificar os procedimentos deste atendimento.');
      const ids = [...new Set(procedures.filter(item =>
        ![true, 1, '1'].includes(item.excluido) && ![false, 0, '0'].includes(item.fl_ativo))
        .map(item => positiveId(item.id_procedimento)).filter(Boolean))];
      const record = await readAuthorization(axios, context.authorizationId);
      const targets = authorizationItems(record, ids).filter(item => ELIGIBLE.has(String(item.in_status)))
        .map(item => positiveId(item.id_procedimento));
      if (!targets.length) return { changed: false };
      const checkSendScope = current => {
        if (!hasRecordedSend(current) && !targets.includes(positiveId(current.id_procedimento)) &&
            String(current.in_status) !== '6') {
          const error = new Error('Registre o envio desta autorização compartilhada no módulo Autorizações; o envio nativo também altera o procedimento principal.');
          error.code = 'SHARED_SEND_REQUIRED';
          throw error;
        }
      };
      checkSendScope(record);
      options.beforeStore?.();
      await storeAuthorization(axios, statusDraft(record, targets, 6, ELIGIBLE));
      const beforeSend = await readAuthorization(axios, context.authorizationId);
      statusDraft(beforeSend, targets, 6, new Set(['6']));
      checkSendScope(beforeSend);
      if (!hasRecordedSend(beforeSend)) {
        options.beforeStore?.();
        await registerSend(axios, beforeSend);
      }
      options.onStored?.();
      const sent = await readAuthorization(axios, context.authorizationId);
      if (!hasRecordedSend(sent)) throw new Error('Data e usuário de envio não foram persistidos.');
      sentStored = true;
      const draft = statusDraft(sent, targets, 10, new Set(['6']));
      options.beforeStore?.();
      await storeAuthorization(axios, draft);
      sessionStored = true;
      options.onStored?.();
      const final = await readAuthorization(axios, context.authorizationId);
      const finalItems = authorizationItems(final, targets);
      if (finalItems.length !== targets.length || finalItems.some(item => String(item.in_status) !== '10') ||
          !hasRecordedSend(final) || final.dt_envio !== sent.dt_envio ||
          positiveId(final.id_usuario_envio) !== positiveId(sent.id_usuario_envio)) {
        throw new Error('Não foi possível confirmar o status final Em Sessão.');
      }
      return { changed: true, procedureIds: targets };
    } catch (error) {
      error.sentStored = sentStored;
      error.sessionStored = sessionStored;
      throw error;
    }
  }

  function completionContext(workflow, guide) {
    const appointment = workflow.marcacao;
    const visit = firstVisits.get(workflow);
    if (!visit || visit.consumed || visit.appointmentId !== positiveId(appointment?.id_marcacao) ||
        // O Klingo já marca e8 ao entrar nas guias; a visita inicial foi validada antes de abrir.
        Number(workflow.etapa) !== 8 || workflow.$refs.listaguias !== guide ||
        !Array.isArray(guide.lista) || !guide.lista.length ||
        positiveId(guide.marcacao?.id_marcacao) !== positiveId(appointment?.id_marcacao)) return null;
    const context = { appointmentId: positiveId(appointment?.id_marcacao),
      attendanceId: positiveId(appointment?.id_atendimento),
      authorizationId: positiveId(appointment?.id_solicitacao_autorizacao) };
    return Object.values(context).every(Boolean) ? context : null;
  }

  function hasCompletedStep(appointment, steps) {
    return steps.some(step => [true, 1, '1'].includes(appointment?.item_status?.etapas?.[`e${step}`])) ||
      (appointment?.atendimento?.progresso_atendimentos || []).some(item =>
        steps.includes(Number(item.id_etapa_atendimento)) && !!item.dt_conclusao &&
        ![false, 0, '0'].includes(item.fl_ativo));
  }

  function isFirstVisit(appointment) {
    const stages = appointment?.item_status?.etapas;
    return !!positiveId(appointment?.id_marcacao) && !!stages &&
      [1, 2, 8].every(n => [false, 0, '0'].includes(stages[`e${n}`])) &&
      !appointment.item_status.finalizado && appointment.item_status.valor !== 'cancelado' &&
      !hasCompletedStep(appointment, [1, 2, 8]);
  }

  async function verifyFirstVisit(axios, id) {
    // No agendamento de hoje, abrir é automático e ainda não existe atendimento.
    // Pedir para_atendimento/guia_tiss aqui faz o serviço nativo retornar HTTP 500.
    const response = await axios.post('/aql?a=marcacoes.show', { q: [{ name: 'marcacoes.show',
      id: 'item', parms: { id } }] });
    if (response.data?.item?.status !== 200) throw new Error('Não foi possível verificar o histórico da recepção.');
    const appointment = response.data.item.data;
    return positiveId(appointment?.id_marcacao) === id && isFirstVisit(appointment);
  }

  function installFirstVisitHook(workflow) {
    if (typeof workflow.abrir !== 'function' || workflow.abrir.__tmReceptionAuthorizationCompletion) return;
    const open = workflow.abrir;
    const wrapped = function (appointment, step = 1, local, callback) {
      // ir_para_etapa(1) chama abrir novamente com callback; não é uma nova abertura do usuário.
      if (typeof callback !== 'function') {
        firstVisits.delete(this);
        if (Number(step) === 1 && isFirstVisit(appointment)) {
          const id = positiveId(appointment.id_marcacao);
          // Consultar antes de abrir impede que uma lista antiga rearme atendimento já iniciado.
          const validation = verifyFirstVisit(this.axios, id).then(allowed => ({ allowed }), error => ({ error }));
          firstVisits.set(this, { appointmentId: id, consumed: false, validation });
        }
      }
      return open.apply(this, arguments);
    };
    wrapped.__tmReceptionAuthorizationCompletion = true;
    workflow.abrir = wrapped;
  }

  function installCompletionHook(workflow) {
    installFirstVisitHook(workflow);
    const util = workflow.$util;
    if (!util || typeof util.atualizar !== 'function') return;
    if (!util.atualizar.__tmReceptionAuthorizationCompletion) {
      const originalUpdate = util.atualizar;
      const wrappedUpdate = function (component, config) {
        const intent = completionIntents.get(component);
        if (!intent || config?.service !== 'guias' || config.func !== 'set_numero_atribuido' ||
            config.dados?.imprimindo !== false) return originalUpdate.apply(this, arguments);
        const callback = config.callback;
        return originalUpdate.call(this, component, { ...config, callback: function (...args) {
          try { return callback?.apply(this, args); }
          finally {
            if (!intent.visit.consumed) {
              intent.visit.consumed = true;
              queueCompletion(intent.context, intent.workflow, intent.visit);
            }
          }
        } });
      };
      wrappedUpdate.__tmReceptionAuthorizationCompletion = true;
      util.atualizar = wrappedUpdate;
    }
    const guide = workflow.$refs.listaguias;
    if (!guide || typeof guide.print !== 'function' || guide.print.__tmReceptionAuthorizationCompletion) return;
    const originalPrint = guide.print;
    const wrappedPrint = function (...args) {
      const context = args[0] === false && args[1] === 'iniciarAtendimentoModal'
        ? completionContext(workflow, this) : null;
      if (context) completionIntents.set(this, { context, workflow, visit: firstVisits.get(workflow) });
      try { return originalPrint.apply(this, args); }
      finally { completionIntents.delete(this); }
    };
    wrappedPrint.__tmReceptionAuthorizationCompletion = true;
    guide.print = wrappedPrint;
  }

  function findReceptionWorkflow() {
    if (!/^#\/recepcao(?:\/|$)/.test(window.location.hash)) return null;
    for (let node = document.getElementById('refresh-button'); node; node = node.parentElement) {
      if (node.__vue__?.$refs?.ini_atd) return node.__vue__.$refs.ini_atd;
    }
    return null;
  }

  function queueCompletion(context, workflow, visit) {
    const account = positiveId(workflow.$store.state.user?.id_usuario);
    const key = `${account}:${context.appointmentId}:${context.attendanceId}`;
    if (pending.has(key)) return;
    const notify = (severity, detail) => workflow.$toast?.add({ severity,
      summary: 'Autorização', detail, life: severity === 'error' ? 10000 : 5000 });
    const updated = () => document.dispatchEvent(new CustomEvent('tm-reception-authorization-updated',
      { detail: { id: context.authorizationId } }));
    const job = Promise.resolve().then(async () => {
      const verification = await visit.validation;
      if (verification.error) throw verification.error;
      if (!verification.allowed) return { changed: false };
      if (!account || !navigator.locks?.request) throw new Error('Coordenação entre abas indisponível.');
      return navigator.locks.request(`klingo-reception-authorization:${account}:${context.authorizationId}`, () =>
        transitionAuthorization(workflow.axios, context, { onStored: updated, beforeStore: () => {
          if (positiveId(workflow.$store.state.user?.id_usuario) !== account) throw new Error('A conta conectada mudou.');
        } }));
    }).then(result => {
      if (result.changed) notify('success', 'Procedimentos deste agendamento: Enviado → Em Sessão.');
    }).catch(error => {
      const detail = error.code === 'SHARED_SEND_REQUIRED' ? error.message : error.sessionStored
        ? 'Atualização enviada, mas o estado final não pôde ser confirmado. Revise a autorização.'
        : error.sentStored
          ? 'Enviado foi registrado, mas Em Sessão não foi confirmado. Revise a autorização.'
          : 'Recepção concluída. Não foi possível atualizar a autorização. Revise no módulo Autorizações.';
      notify('error', detail);
      console.warn('[TM] Atualização de autorização após concluir recepção:', error.message);
    }).finally(() => pending.delete(key));
    pending.set(key, job);
  }

  tmRuntime.register('autorização após concluir a Recepção', () => {
    const workflow = findReceptionWorkflow();
    if (workflow) installCompletionHook(workflow);
  }, ['#/recepcao']);
})();
