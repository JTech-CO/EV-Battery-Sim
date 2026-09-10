# EV Battery Sim - model notes

## 1. Scope
The simulator prioritizes transparent browser execution over pretending to run a full porous-electrode PDE solver. It uses source-based equilibrium electrochemistry and explicit reduced-order assumptions for dynamic losses and aging screening.

## 2. Equilibrium electrochemistry
SOC is mapped linearly into the source BPX negative and positive stoichiometric windows. The positive stoichiometry decreases as cell SOC increases. Electrode OCP fits are evaluated with hard-coded functions; arbitrary expression evaluation is not used.

The open-circuit voltage is

`U_ocv = U_p(x_p) - U_n(x_n)`.

## 3. Dynamic terminal voltage
A two-RC Thevenin approximation is used:

`V = U_ocv - I R0 - V1 - V2`

`dVi/dt = -(Vi/taui) + I Ri/taui`.

The RC parameters are engineering priors stored in `assets/data/model-priors.json`; they are not BPX measurements. Current is discharge-positive.

## 4. Thermal model
The cell is a single lumped thermal node:

`C_th dT/dt = Q_gen - h A_ext (T - T_amb)`

with `C_th = rho cp V`.

Diagnostics use `Q_irr = I(U_ocv - V)` and `Q_rev = - I T dU_ocv/dT`. This cannot predict a core-to-surface temperature gradient and should not be read as a spatial thermal solution.

## 5. Vehicle and pack
The US06 file is a prescribed speed trace. Battery current is derived through a vehicle model rather than read from EPA data. The wheel force includes inertial, rolling, grade, and aerodynamic terms. Drive/regen efficiencies, auxiliary power, and power limits are configurable priors.

For an idealized `Ns × Np` topology, branch cell current is solved from requested per-cell power and the instantaneous R0 voltage relation. The solver then clips against C-rate and source voltage limits. It does not model cell-to-cell dispersion, busbar resistance, balancing, contactors, or thermal-network nonuniformity.

## 6. Degradation screening
The app tracks absolute Ah throughput and EFC. Optional SOH loss and plating/aging risk scores are screening priors only. They do not represent validated SEI thickness, LLI, LAM, or plated-lithium mass.

## 7. Validation path
For the NMC preset, the public 1C source curve is sampled at its reference times and compared against the reduced model. RMSE and maximum absolute voltage error are reported rather than hidden. This is an in-family reference comparison, not an independent holdout.

## 8. Meaning of the 3D views
The cell cross-section and pack view use canvas geometry and perspective projection to show depth, rotation, cell arrangement, SOC, temperature, and power state. These 3D shapes are not spatial DFN solutions, finite-element thermal fields, CT reconstructions, or actual OEM pack geometry. They are schematic views for interpreting the reduced simulator state.
