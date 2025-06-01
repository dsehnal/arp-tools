# Welcome to ARP tools

[ARP Tools](https://dsehnal.github.io/arp-tools-dev/#/) is a powerful laboratory automation platform that streamlines assay-ready plate creation using acoustic liquid handling technology. This tool set enables researchers to rapidly generate formatted plates for dose-response studies with minimal intervention, maximizing reusability and minimizing errors through standardized bucket protocols.


<div align="center">
  <img src="images/plate-layout2.PNG" alt="Centered image">
</div>


## Core Functionality

The primary strength of ARP Tools centers on its "configure once, reuse forever" approach to experimental design. The system calculates and implements sophisticated dose-response curves across standardized plate patterns, automating complex serial dilutions, concentration gradients, and replicate positioning to ensure consistent results.

<div align="center">
  <img src="images/curve.PNG" alt="Centered image">
</div>

Most importantly, these optimized experimental designs are saved as reusable buckets, allowing researchers to apply pre-configured protocols to new compound sets without reconfiguring parameters. This reusability-focused architecture transforms time-intensive setup processes into simple template selection, dramatically reducing preparation time while maintaining the precision and consistency of validated experimental designs across multiple studies.

## The Bucket System Architecture

Central to ARP Tools' organization is the "bucket" concept - a sophisticated container framework that encompasses multiple critical components:

**Pattern and Layout Management**: Each bucket defines the precise spatial arrangement of samples, including the positioning of test compounds, positive and negative controls, reference standards, and blank wells. This layout specification ensures consistent plate geography across experiments and facilitates automated data analysis.

**Replication Strategy**: The bucket system incorporates user-defined replication schemes, allowing researchers to specify the number and distribution of technical replicates for statistical robustness. This includes consideration of edge effects, systematic positioning biases, and randomization protocols.

**Dose-Response Integration**: Each bucket is intrinsically linked to a specific dose-response curve regimen, which defines parameters such as concentration ranges, dilution factors, number of dose points, and curve fitting models. This integration ensures that the physical plate layout perfectly matches the intended experimental design.

<div align="center">
  <img src="images/bucket.PNG" alt="Centered image">
</div>


## Workflow and Request Management

The ARP Tools workflow operates through a user-friendly request system where researchers can:

**Submit Targeted Requests**: Users initiate experiments by selecting appropriate buckets that match their experimental objectives and assay requirements.

**Compound Integration**: The platform allows seamless addition of test compounds to existing bucket frameworks, automatically calculating required volumes, stock concentrations, and dispensing protocols based on the Echo system's capabilities.

**Automated Optimization**: The system optimizes liquid handling protocols, minimizing reagent waste while maximizing precision through intelligent path planning and volume calculations.

## Technical Advantages

The integration with Echo acoustic dispensing technology provides several key benefits:

- **Precision**: Nanoliter-scale accuracy eliminates pipetting errors and reduces compound consumption
- **Speed**: Automated dispensing dramatically reduces plate preparation time
- **Reproducibility**: Standardized protocols ensure consistent results across different operators and time points
- **Scalability**: Rapid processing of multiple plates for large-scale screening campaigns
- **Documentation**: Complete audit trails and automated record-keeping for regulatory compliance

This sophisticated platform transforms traditionally labor-intensive plate preparation into an efficient, standardized process that enhances both productivity and data quality in drug discovery and biological research applications.




