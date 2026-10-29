# fleet-central-two-downmass

Input actions: 3

System time: 0.00 s
Fleet Central: radius=316.250 speed=6.160 perigee=316.250 apogee=316.250
stage-1: centerRadius=88.000 centerSpeed=11.677 CM perigee=88.000 CM apogee=88.000 longLeg=10.000 envelope=78.000..98.000 fills inner(up=0,down=0) outer(up=0,down=0)
stage-2: centerRadius=165.000 centerSpeed=8.528 CM perigee=165.000 CM apogee=165.000 longLeg=14.000 envelope=151.000..179.000 fills inner(up=0,down=0) outer(up=0,down=0)
stage-3: centerRadius=225.000 centerSpeed=7.303 CM perigee=225.000 CM apogee=225.000 longLeg=18.000 envelope=207.000..243.000 fills inner(up=0,down=0) outer(up=0,down=0)

Selectable transfers:
1. launch 12-ton upmass from Civic Prime [civic-prime-space-gun -> stage-1]
2. launch 12-ton downmass from Fleet Central [fleet-central-downmass-source -> stage-3]

## Action 1: fleet-central-downmass-source

Time: 0.00 s

Transfer: launch 12-ton downmass from Fleet Central
Mode: source-load
Source: fleet-central-source fleet-central-downmass-source.inner
Target: stage-3.outer
Source radius: 316.250
Source speed: 6.160
Source orbit: perigee=316.250 apogee=316.250 h=1948.076
Target barbell: centerRadius=225.000 centerSpeed=7.303 CM perigee=225.000 CM apogee=225.000 longLeg=18.000 envelope=207.000..243.000 fills inner(up=0,down=0) outer(up=0,down=0)

Timing estimate: unsupported for this Stage 1 indicator.

Solver converged: true
Failure reason: none
Scalar bounds: -0.681 .. -0.418
Scalar correction: -0.631
Delta-v magnitude: 0.631
Miss: 4.525
Nominal miss: inf
Iterations: 1
Minimum catch time: 127.677 s
Payload orbit from solved initial condition: perigee=213.269 apogee=316.250 h=1748.414 e=0.194
Trace:
- sample #0 scalar=-0.681 miss=48.150 t=182.05 h=1732.812 targetH=1643.168 deltaH=89.644 cross=true
- sample #1 scalar=-0.679 miss=47.554 t=181.65 h=1733.332 targetH=1643.168 deltaH=90.164 cross=true
- sample #2 scalar=-0.677 miss=47.023 t=181.30 h=1733.852 targetH=1643.168 deltaH=90.684 cross=true
- sample #3 scalar=-0.676 miss=46.428 t=180.90 h=1734.372 targetH=1643.168 deltaH=91.204 cross=true
- sample #4 scalar=-0.674 miss=45.898 t=180.55 h=1734.892 targetH=1643.168 deltaH=91.725 cross=true
- sample #5 scalar=-0.672 miss=45.304 t=180.15 h=1735.412 targetH=1643.168 deltaH=92.245 cross=true
- sample #6 scalar=-0.671 miss=44.711 t=179.75 h=1735.932 targetH=1643.168 deltaH=92.765 cross=true
- sample #7 scalar=-0.669 miss=44.119 t=179.35 h=1736.452 targetH=1643.168 deltaH=93.285 cross=true
- sample #8 scalar=-0.668 miss=43.528 t=178.95 h=1736.972 targetH=1643.168 deltaH=93.805 cross=true
- sample #9 scalar=-0.666 miss=42.874 t=178.50 h=1737.493 targetH=1643.168 deltaH=94.325 cross=true
- sample #10 scalar=-0.664 miss=42.285 t=178.10 h=1738.013 targetH=1643.168 deltaH=94.845 cross=true
- sample #11 scalar=-0.663 miss=41.633 t=177.65 h=1738.533 targetH=1643.168 deltaH=95.365 cross=true
- sample #12 scalar=-0.661 miss=40.984 t=177.20 h=1739.053 targetH=1643.168 deltaH=95.885 cross=true
- sample #13 scalar=-0.659 miss=40.335 t=176.75 h=1739.573 targetH=1643.168 deltaH=96.405 cross=true
- sample #14 scalar=-0.658 miss=39.689 t=176.30 h=1740.093 targetH=1643.168 deltaH=96.925 cross=true
- sample #15 scalar=-0.656 miss=39.045 t=175.85 h=1740.613 targetH=1643.168 deltaH=97.445 cross=true
- sample #16 scalar=-0.654 miss=38.339 t=175.35 h=1741.133 targetH=1643.168 deltaH=97.965 cross=true
- sample #17 scalar=-0.653 miss=37.636 t=174.85 h=1741.653 targetH=1643.168 deltaH=98.485 cross=true
- sample #18 scalar=-0.651 miss=36.935 t=174.35 h=1742.173 targetH=1643.168 deltaH=99.005 cross=true
- sample #19 scalar=-0.649 miss=36.238 t=173.85 h=1742.693 targetH=1643.168 deltaH=99.525 cross=true
- sample #20 scalar=-0.648 miss=35.480 t=173.30 h=1743.213 targetH=1643.168 deltaH=100.046 cross=true
- sample #21 scalar=-0.646 miss=34.790 t=172.80 h=1743.733 targetH=1643.168 deltaH=100.566 cross=true
- sample #22 scalar=-0.644 miss=33.976 t=172.20 h=1744.253 targetH=1643.168 deltaH=101.086 cross=true
- sample #23 scalar=-0.643 miss=33.231 t=171.65 h=1744.773 targetH=1643.168 deltaH=101.606 cross=true
- sample #24 scalar=-0.641 miss=32.427 t=171.05 h=1745.293 targetH=1643.168 deltaH=102.126 cross=true
- sample #25 scalar=-0.640 miss=31.628 t=170.45 h=1745.813 targetH=1643.168 deltaH=102.646 cross=true
- sample #26 scalar=-0.638 miss=30.836 t=169.85 h=1746.334 targetH=1643.168 deltaH=103.166 cross=true
- sample #27 scalar=-0.636 miss=29.987 t=169.20 h=1746.854 targetH=1643.168 deltaH=103.686 cross=true
- sample #28 scalar=-0.635 miss=29.083 t=168.50 h=1747.374 targetH=1643.168 deltaH=104.206 cross=true
- sample #29 scalar=-0.633 miss=28.188 t=167.80 h=1747.894 targetH=1643.168 deltaH=104.726 cross=true
- sample #30 scalar=-0.631 miss=-4.525 t=128.35 h=1748.414 targetH=1643.168 deltaH=105.246 cross=true
- bisect #0 scalar=-0.631 miss=-4.525 t=128.35 h=1748.414 targetH=1643.168 deltaH=105.246 cross=true

Result: Source transfer complete: 12 tons received.
Catch relative speed: 0.143

System time: 128.35 s
Fleet Central: radius=316.250 speed=6.160 perigee=316.250 apogee=316.250
stage-1: centerRadius=83.695 centerSpeed=12.271 CM perigee=82.345 CM apogee=93.897 longLeg=10.000 envelope=72.345..103.897 fills inner(up=0,down=0) outer(up=0,down=0)
stage-2: centerRadius=164.715 centerSpeed=8.543 CM perigee=163.793 CM apogee=166.204 longLeg=14.000 envelope=149.793..180.204 fills inner(up=0,down=0) outer(up=0,down=0)
stage-3: centerRadius=218.416 centerSpeed=7.521 CM perigee=217.298 CM apogee=232.818 longLeg=19.256 envelope=198.042..252.074 fills inner(up=0,down=0) outer(up=0,down=12)

Selectable transfers:
1. launch 12-ton upmass from Civic Prime [civic-prime-space-gun -> stage-1]
2. stage-3 downmass across tether [stage-3 -> stage-3]

## Action 2: stage-3 downmass across tether

Time: 138.35 s

Transfer: stage-3 downmass across tether
Mode: cross-tether
Source: barbell-end stage-3.outer
Target: stage-3.inner
Source radius: 236.261
Source speed: 8.051
Source orbit: perigee=236.074 apogee=416.659 h=1901.744
Target barbell: centerRadius=219.523 centerSpeed=7.485 CM perigee=217.943 CM apogee=232.266 longLeg=19.256 envelope=198.687..251.522 fills inner(up=0,down=0) outer(up=0,down=12)

Timing estimate: unsupported for this Stage 1 indicator.

Result: Tether shift complete: 12 tons repositioned.

System time: 138.35 s
Fleet Central: radius=316.250 speed=6.160 perigee=316.250 apogee=316.250
stage-1: centerRadius=86.313 centerSpeed=11.915 CM perigee=84.879 CM apogee=91.460 longLeg=10.000 envelope=74.879..101.460 fills inner(up=0,down=0) outer(up=0,down=0)
stage-2: centerRadius=163.152 centerSpeed=8.624 CM perigee=161.879 CM apogee=168.128 longLeg=14.000 envelope=147.879..182.128 fills inner(up=0,down=0) outer(up=0,down=0)
stage-3: centerRadius=219.523 centerSpeed=7.485 CM perigee=217.943 CM apogee=232.266 longLeg=19.256 envelope=198.687..251.522 fills inner(up=0,down=12) outer(up=0,down=0)

Selectable transfers:
1. launch 12-ton upmass from Civic Prime [civic-prime-space-gun -> stage-1]
2. stage-3 downmass to stage-2 [stage-3 -> stage-2]
3. launch 12-ton downmass from Fleet Central [fleet-central-downmass-source -> stage-3]

## Action 3: fleet-central-downmass-source

Time: 148.35 s

Transfer: launch 12-ton downmass from Fleet Central
Mode: source-load
Source: fleet-central-source fleet-central-downmass-source.inner
Target: stage-3.outer
Source radius: 316.250
Source speed: 6.160
Source orbit: perigee=316.250 apogee=316.250 h=1948.076
Target barbell: centerRadius=220.732 centerSpeed=7.445 CM perigee=218.733 CM apogee=231.533 longLeg=19.256 envelope=199.477..250.788 fills inner(up=0,down=12) outer(up=0,down=0)

Timing estimate: unsupported for this Stage 1 indicator.

Solver converged: false
Failure reason: no-angular-crossing
Scalar bounds: -0.742 .. -0.366
Scalar correction: 0.000
Delta-v magnitude: 0.000
Miss: inf
Nominal miss: inf
Iterations: 0
Minimum catch time: 126.169 s
Payload orbit from solved initial condition: perigee=316.250 apogee=316.250 h=1948.076 e=0.000
Trace:
- sample #0 scalar=-0.742 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #1 scalar=-0.740 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #2 scalar=-0.737 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #3 scalar=-0.735 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #4 scalar=-0.733 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #5 scalar=-0.730 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #6 scalar=-0.728 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #7 scalar=-0.726 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #8 scalar=-0.723 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #9 scalar=-0.721 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #10 scalar=-0.719 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #11 scalar=-0.716 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #12 scalar=-0.714 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #13 scalar=-0.712 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #14 scalar=-0.709 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #15 scalar=-0.707 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #16 scalar=-0.705 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #17 scalar=-0.702 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #18 scalar=-0.700 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #19 scalar=-0.697 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #20 scalar=-0.695 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #21 scalar=-0.693 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #22 scalar=-0.690 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #23 scalar=-0.688 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #24 scalar=-0.686 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #25 scalar=-0.683 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #26 scalar=-0.681 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #27 scalar=-0.679 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #28 scalar=-0.676 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #29 scalar=-0.674 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #30 scalar=-0.672 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #31 scalar=-0.669 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #32 scalar=-0.667 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #33 scalar=-0.665 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #34 scalar=-0.662 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #35 scalar=-0.660 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #36 scalar=-0.658 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #37 scalar=-0.655 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #38 scalar=-0.653 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #39 scalar=-0.651 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #40 scalar=-0.648 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #41 scalar=-0.646 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #42 scalar=-0.643 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #43 scalar=-0.641 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #44 scalar=-0.639 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #45 scalar=-0.636 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #46 scalar=-0.634 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #47 scalar=-0.632 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #48 scalar=-0.629 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #49 scalar=-0.627 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #50 scalar=-0.625 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #51 scalar=-0.622 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #52 scalar=-0.620 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #53 scalar=-0.618 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #54 scalar=-0.615 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #55 scalar=-0.613 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #56 scalar=-0.611 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #57 scalar=-0.608 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #58 scalar=-0.606 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #59 scalar=-0.604 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #60 scalar=-0.601 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #61 scalar=-0.599 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #62 scalar=-0.597 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #63 scalar=-0.594 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #64 scalar=-0.592 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #65 scalar=-0.589 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #66 scalar=-0.587 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #67 scalar=-0.585 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #68 scalar=-0.582 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #69 scalar=-0.580 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #70 scalar=-0.578 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #71 scalar=-0.575 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #72 scalar=-0.575 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #73 scalar=-0.573 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #74 scalar=-0.571 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #75 scalar=-0.568 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #76 scalar=-0.566 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #77 scalar=-0.564 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #78 scalar=-0.561 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
- sample #79 scalar=-0.559 miss=inf t=none h=none targetH=1627.509 deltaH=none cross=false
... 244 more trace rows omitted

Result: launch rejected by solver.
