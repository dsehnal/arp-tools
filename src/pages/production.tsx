export function ProductionUI() {
    return (
        <ul>
            <li>Select one or more requests to produce at the same time</li>
            <li>Produces a list of required volumes for each sample at specified concentrations</li>
            <li>Upload rackscans that map SampleID to rack positions</li>
            <li>
                Generate: rack -&gt; nARP picklist, intermediate plate picklists, ARP plate picklists, ARP platemaps
            </li>
            <li>
                ARP Platemap columns:{' '}
                <code>Plate Label/Barcode, Well, Sample ID, Concentration, Volume, Control Kind</code>
            </li>
            <li>Production history</li>
        </ul>
    );
}
