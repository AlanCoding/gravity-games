# civic-prime-first-upmass

Input actions: 2

System time: 0.00 s
Fleet Central: radius=316.250 speed=6.160 perigee=316.250 apogee=316.250
stage-1: centerRadius=88.000 centerSpeed=11.677 CM perigee=88.000 CM apogee=88.000 longLeg=10.000 envelope=78.000..98.000 fills inner(up=0,down=0) outer(up=0,down=0)
stage-2: centerRadius=165.000 centerSpeed=8.528 CM perigee=165.000 CM apogee=165.000 longLeg=14.000 envelope=151.000..179.000 fills inner(up=0,down=0) outer(up=0,down=0)
stage-3: centerRadius=225.000 centerSpeed=7.303 CM perigee=225.000 CM apogee=225.000 longLeg=18.000 envelope=207.000..243.000 fills inner(up=0,down=0) outer(up=0,down=0)

Selectable transfers:
1. launch 12-ton upmass from Civic Prime [civic-prime-space-gun -> stage-1]
2. launch 12-ton downmass from Fleet Central [fleet-central-downmass-source -> stage-3]

## Action 1: civic-prime-space-gun

Time: 0.00 s

Transfer: launch 12-ton upmass from Civic Prime
Mode: source-load
Source: civic-prime-launcher civic-prime-space-gun.outer
Target: stage-1.inner
Source radius: 48.000
Source speed: 0.000
Source orbit: perigee=0.000 apogee=inf h=0.000
Target barbell: centerRadius=88.000 centerSpeed=11.677 CM perigee=88.000 CM apogee=88.000 longLeg=10.000 envelope=78.000..98.000 fills inner(up=0,down=0) outer(up=0,down=0)

Timing estimate: unsupported for this Stage 1 indicator.

Solver converged: false
Failure reason: no-angular-crossing
Scalar bounds: 17.593 .. 18.320
Scalar correction: 0.000
Delta-v magnitude: 0.000
Miss: inf
Nominal miss: inf
Iterations: 0
Minimum catch time: 0.150 s
Payload orbit from solved initial condition: perigee=0.000 apogee=inf h=0.000 e=1.000
Trace:
- sample #0 scalar=17.593 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #1 scalar=17.593 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #2 scalar=17.598 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #3 scalar=17.602 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #4 scalar=17.607 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #5 scalar=17.611 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #6 scalar=17.616 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #7 scalar=17.621 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #8 scalar=17.625 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #9 scalar=17.630 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #10 scalar=17.634 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #11 scalar=17.639 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #12 scalar=17.643 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #13 scalar=17.648 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #14 scalar=17.652 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #15 scalar=17.657 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #16 scalar=17.661 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #17 scalar=17.666 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #18 scalar=17.670 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #19 scalar=17.675 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #20 scalar=17.680 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #21 scalar=17.684 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #22 scalar=17.689 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #23 scalar=17.693 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #24 scalar=17.698 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #25 scalar=17.702 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #26 scalar=17.707 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #27 scalar=17.711 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #28 scalar=17.716 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #29 scalar=17.720 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #30 scalar=17.725 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #31 scalar=17.730 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #32 scalar=17.734 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #33 scalar=17.739 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #34 scalar=17.743 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #35 scalar=17.748 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #36 scalar=17.752 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #37 scalar=17.757 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #38 scalar=17.761 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #39 scalar=17.766 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #40 scalar=17.770 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #41 scalar=17.775 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #42 scalar=17.779 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #43 scalar=17.784 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #44 scalar=17.789 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #45 scalar=17.793 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #46 scalar=17.798 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #47 scalar=17.802 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #48 scalar=17.807 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #49 scalar=17.811 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #50 scalar=17.816 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #51 scalar=17.820 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #52 scalar=17.825 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #53 scalar=17.829 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #54 scalar=17.834 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #55 scalar=17.838 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #56 scalar=17.843 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #57 scalar=17.848 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #58 scalar=17.852 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #59 scalar=17.857 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #60 scalar=17.861 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #61 scalar=17.866 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #62 scalar=17.870 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #63 scalar=17.875 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #64 scalar=17.879 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #65 scalar=17.884 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #66 scalar=17.888 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #67 scalar=17.893 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #68 scalar=17.898 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #69 scalar=17.902 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #70 scalar=17.907 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #71 scalar=17.911 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #72 scalar=17.916 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #73 scalar=17.920 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #74 scalar=17.925 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #75 scalar=17.929 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #76 scalar=17.934 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #77 scalar=17.938 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #78 scalar=17.943 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
- sample #79 scalar=17.947 miss=inf t=none h=none targetH=967.471 deltaH=none cross=false
... 246 more trace rows omitted

Result: launch rejected by solver.

## Action 2: civic-prime-space-gun

Time: 60.00 s

Transfer: launch 12-ton upmass from Civic Prime
Mode: source-load
Source: civic-prime-launcher civic-prime-space-gun.outer
Target: stage-1.inner
Source radius: 48.000
Source speed: 0.000
Source orbit: perigee=0.000 apogee=inf h=0.000
Target barbell: centerRadius=82.549 centerSpeed=12.435 CM perigee=82.291 CM apogee=94.025 longLeg=10.000 envelope=72.291..104.025 fills inner(up=0,down=0) outer(up=0,down=0)

Timing estimate: unsupported for this Stage 1 indicator.

Solver converged: true
Failure reason: none
Scalar bounds: 17.334 .. 18.497
Scalar correction: 18.163
Delta-v magnitude: 18.163
Miss: 0.777
Nominal miss: inf
Iterations: 1
Minimum catch time: 0.150 s
Payload orbit from solved initial condition: perigee=48.000 apogee=93.078 h=871.806 e=0.320
Trace:
- sample #0 scalar=17.334 miss=-28.652 t=26.85 h=832.053 targetH=933.100 deltaH=-101.047 cross=true
- sample #1 scalar=17.342 miss=-28.670 t=26.95 h=832.402 targetH=933.100 deltaH=-100.698 cross=true
- sample #2 scalar=17.347 miss=-28.678 t=27.00 h=832.662 targetH=933.100 deltaH=-100.438 cross=true
- sample #3 scalar=17.349 miss=-28.678 t=27.00 h=832.751 targetH=933.100 deltaH=-100.349 cross=true
- sample #4 scalar=17.356 miss=-28.693 t=27.10 h=833.100 targetH=933.100 deltaH=-100.001 cross=true
- sample #5 scalar=17.364 miss=-28.704 t=27.20 h=833.448 targetH=933.100 deltaH=-99.652 cross=true
- sample #6 scalar=17.371 miss=-28.712 t=27.25 h=833.797 targetH=933.100 deltaH=-99.303 cross=true
- sample #7 scalar=17.378 miss=-28.721 t=27.35 h=834.146 targetH=933.100 deltaH=-98.955 cross=true
- sample #8 scalar=17.385 miss=-28.726 t=27.45 h=834.494 targetH=933.100 deltaH=-98.606 cross=true
- sample #9 scalar=17.393 miss=-28.734 t=27.50 h=834.843 targetH=933.100 deltaH=-98.257 cross=true
- sample #10 scalar=17.400 miss=-28.736 t=27.60 h=835.192 targetH=933.100 deltaH=-97.909 cross=true
- sample #11 scalar=17.407 miss=-28.735 t=27.70 h=835.541 targetH=933.100 deltaH=-97.560 cross=true
- sample #12 scalar=17.414 miss=-28.742 t=27.75 h=835.889 targetH=933.100 deltaH=-97.211 cross=true
- sample #13 scalar=17.422 miss=-28.738 t=27.85 h=836.238 targetH=933.100 deltaH=-96.862 cross=true
- sample #14 scalar=17.429 miss=-28.731 t=27.95 h=836.587 targetH=933.100 deltaH=-96.514 cross=true
- sample #15 scalar=17.436 miss=-28.721 t=28.05 h=836.935 targetH=933.100 deltaH=-96.165 cross=true
- sample #16 scalar=17.443 miss=-28.728 t=28.10 h=837.284 targetH=933.100 deltaH=-95.816 cross=true
- sample #17 scalar=17.451 miss=-28.715 t=28.20 h=837.633 targetH=933.100 deltaH=-95.468 cross=true
- sample #18 scalar=17.458 miss=-28.699 t=28.30 h=837.981 targetH=933.100 deltaH=-95.119 cross=true
- sample #19 scalar=17.465 miss=-28.706 t=28.35 h=838.330 targetH=933.100 deltaH=-94.770 cross=true
- sample #20 scalar=17.472 miss=-28.686 t=28.45 h=838.679 targetH=933.100 deltaH=-94.422 cross=true
- sample #21 scalar=17.480 miss=-28.664 t=28.55 h=839.028 targetH=933.100 deltaH=-94.073 cross=true
- sample #22 scalar=17.487 miss=-28.639 t=28.65 h=839.376 targetH=933.100 deltaH=-93.724 cross=true
- sample #23 scalar=17.494 miss=-28.646 t=28.70 h=839.725 targetH=933.100 deltaH=-93.375 cross=true
- sample #24 scalar=17.502 miss=-28.618 t=28.80 h=840.074 targetH=933.100 deltaH=-93.027 cross=true
- sample #25 scalar=17.509 miss=-28.587 t=28.90 h=840.422 targetH=933.100 deltaH=-92.678 cross=true
- sample #26 scalar=17.516 miss=-28.553 t=29.00 h=840.771 targetH=933.100 deltaH=-92.329 cross=true
- sample #27 scalar=17.523 miss=-28.560 t=29.05 h=841.120 targetH=933.100 deltaH=-91.981 cross=true
- sample #28 scalar=17.531 miss=-28.523 t=29.15 h=841.469 targetH=933.100 deltaH=-91.632 cross=true
- sample #29 scalar=17.538 miss=-28.483 t=29.25 h=841.817 targetH=933.100 deltaH=-91.283 cross=true
- sample #30 scalar=17.545 miss=-28.441 t=29.35 h=842.166 targetH=933.100 deltaH=-90.934 cross=true
- sample #31 scalar=17.552 miss=-28.395 t=29.45 h=842.515 targetH=933.100 deltaH=-90.586 cross=true
- sample #32 scalar=17.560 miss=-28.403 t=29.50 h=842.863 targetH=933.100 deltaH=-90.237 cross=true
- sample #33 scalar=17.567 miss=-28.355 t=29.60 h=843.212 targetH=933.100 deltaH=-89.888 cross=true
- sample #34 scalar=17.574 miss=-28.304 t=29.70 h=843.561 targetH=933.100 deltaH=-89.540 cross=true
- sample #35 scalar=17.581 miss=-28.251 t=29.80 h=843.909 targetH=933.100 deltaH=-89.191 cross=true
- sample #36 scalar=17.589 miss=-28.194 t=29.90 h=844.258 targetH=933.100 deltaH=-88.842 cross=true
- sample #37 scalar=17.596 miss=-28.135 t=30.00 h=844.607 targetH=933.100 deltaH=-88.494 cross=true
- sample #38 scalar=17.603 miss=-28.074 t=30.10 h=844.956 targetH=933.100 deltaH=-88.145 cross=true
- sample #39 scalar=17.611 miss=-28.083 t=30.15 h=845.304 targetH=933.100 deltaH=-87.796 cross=true
- sample #40 scalar=17.618 miss=-28.019 t=30.25 h=845.653 targetH=933.100 deltaH=-87.447 cross=true
- sample #41 scalar=17.625 miss=-27.953 t=30.35 h=846.002 targetH=933.100 deltaH=-87.099 cross=true
- sample #42 scalar=17.632 miss=-27.884 t=30.45 h=846.350 targetH=933.100 deltaH=-86.750 cross=true
- sample #43 scalar=17.640 miss=-27.812 t=30.55 h=846.699 targetH=933.100 deltaH=-86.401 cross=true
- sample #44 scalar=17.647 miss=-27.738 t=30.65 h=847.048 targetH=933.100 deltaH=-86.053 cross=true
- sample #45 scalar=17.654 miss=-27.662 t=30.75 h=847.396 targetH=933.100 deltaH=-85.704 cross=true
- sample #46 scalar=17.661 miss=-27.583 t=30.85 h=847.745 targetH=933.100 deltaH=-85.355 cross=true
- sample #47 scalar=17.669 miss=-27.502 t=30.95 h=848.094 targetH=933.100 deltaH=-85.006 cross=true
- sample #48 scalar=17.676 miss=-27.418 t=31.05 h=848.443 targetH=933.100 deltaH=-84.658 cross=true
- sample #49 scalar=17.683 miss=-27.332 t=31.15 h=848.791 targetH=933.100 deltaH=-84.309 cross=true
- sample #50 scalar=17.690 miss=-27.244 t=31.25 h=849.140 targetH=933.100 deltaH=-83.960 cross=true
- sample #51 scalar=17.698 miss=-27.154 t=31.35 h=849.489 targetH=933.100 deltaH=-83.612 cross=true
- sample #52 scalar=17.705 miss=-27.061 t=31.45 h=849.837 targetH=933.100 deltaH=-83.263 cross=true
- sample #53 scalar=17.712 miss=-26.967 t=31.55 h=850.186 targetH=933.100 deltaH=-82.914 cross=true
- sample #54 scalar=17.719 miss=-26.870 t=31.65 h=850.535 targetH=933.100 deltaH=-82.566 cross=true
- sample #55 scalar=17.727 miss=-26.771 t=31.75 h=850.884 targetH=933.100 deltaH=-82.217 cross=true
- sample #56 scalar=17.734 miss=-26.671 t=31.85 h=851.232 targetH=933.100 deltaH=-81.868 cross=true
- sample #57 scalar=17.741 miss=-26.568 t=31.95 h=851.581 targetH=933.100 deltaH=-81.519 cross=true
- sample #58 scalar=17.749 miss=-26.463 t=32.05 h=851.930 targetH=933.100 deltaH=-81.171 cross=true
- sample #59 scalar=17.756 miss=-26.357 t=32.15 h=852.278 targetH=933.100 deltaH=-80.822 cross=true
- sample #60 scalar=17.763 miss=-26.248 t=32.25 h=852.627 targetH=933.100 deltaH=-80.473 cross=true
- sample #61 scalar=17.770 miss=-26.138 t=32.35 h=852.976 targetH=933.100 deltaH=-80.125 cross=true
- sample #62 scalar=17.778 miss=-26.026 t=32.45 h=853.324 targetH=933.100 deltaH=-79.776 cross=true
- sample #63 scalar=17.781 miss=-25.963 t=32.50 h=853.483 targetH=933.100 deltaH=-79.617 cross=true
- sample #64 scalar=17.785 miss=-25.777 t=32.60 h=853.673 targetH=933.100 deltaH=-79.427 cross=true
- sample #65 scalar=17.792 miss=-25.660 t=32.70 h=854.022 targetH=933.100 deltaH=-79.079 cross=true
- sample #66 scalar=17.799 miss=-25.541 t=32.80 h=854.371 targetH=933.100 deltaH=-78.730 cross=true
- sample #67 scalar=17.807 miss=-25.420 t=32.90 h=854.719 targetH=933.100 deltaH=-78.381 cross=true
- sample #68 scalar=17.814 miss=-25.297 t=33.00 h=855.068 targetH=933.100 deltaH=-78.032 cross=true
- sample #69 scalar=17.821 miss=-25.025 t=33.15 h=855.417 targetH=933.100 deltaH=-77.684 cross=true
- sample #70 scalar=17.828 miss=-24.898 t=33.25 h=855.765 targetH=933.100 deltaH=-77.335 cross=true
- sample #71 scalar=17.836 miss=-24.769 t=33.35 h=856.114 targetH=933.100 deltaH=-76.986 cross=true
- sample #72 scalar=17.843 miss=-24.639 t=33.45 h=856.463 targetH=933.100 deltaH=-76.638 cross=true
- sample #73 scalar=17.850 miss=-24.349 t=33.60 h=856.812 targetH=933.100 deltaH=-76.289 cross=true
- sample #74 scalar=17.858 miss=-24.214 t=33.70 h=857.160 targetH=933.100 deltaH=-75.940 cross=true
- sample #75 scalar=17.865 miss=-24.078 t=33.80 h=857.509 targetH=933.100 deltaH=-75.591 cross=true
- sample #76 scalar=17.872 miss=-23.775 t=33.95 h=857.858 targetH=933.100 deltaH=-75.243 cross=true
- sample #77 scalar=17.879 miss=-23.635 t=34.05 h=858.206 targetH=933.100 deltaH=-74.894 cross=true
- sample #78 scalar=17.887 miss=-23.322 t=34.20 h=858.555 targetH=933.100 deltaH=-74.545 cross=true
- sample #79 scalar=17.894 miss=-23.178 t=34.30 h=858.904 targetH=933.100 deltaH=-74.197 cross=true
... 38 more trace rows omitted

Result: Source transfer complete: 12 tons received.
Catch relative speed: 4.290

System time: 102.00 s
Fleet Central: radius=316.250 speed=6.160 perigee=316.250 apogee=316.250
stage-1: centerRadius=84.445 centerSpeed=12.163 CM perigee=83.729 CM apogee=92.399 longLeg=10.698 envelope=73.031..103.097 fills inner(up=12,down=0) outer(up=0,down=0)
stage-2: centerRadius=164.941 centerSpeed=8.535 CM perigee=162.925 CM apogee=167.343 longLeg=14.000 envelope=148.925..181.343 fills inner(up=0,down=0) outer(up=0,down=0)
stage-3: centerRadius=217.058 centerSpeed=7.565 CM perigee=216.821 CM apogee=233.127 longLeg=18.000 envelope=198.821..251.127 fills inner(up=0,down=0) outer(up=0,down=0)

Selectable transfers:
1. stage-1 upmass across tether [stage-1 -> stage-1]
2. launch 12-ton downmass from Fleet Central [fleet-central-downmass-source -> stage-3]
