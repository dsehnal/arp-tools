import { ReactiveModel } from "@/lib/reactive-model";
import { DefaultCurveOptions, DilutionCurve, DilutionCurveOptions } from "@/model/curve";
import { BehaviorSubject } from "rxjs";
import { CurvesApi } from "./api";
import { useParams } from "react-router";
import { useAsyncModel } from "@/lib/hooks/use-async-model";

class EditCurveModel extends ReactiveModel {
    state = {
        options: new BehaviorSubject<DilutionCurveOptions>(DefaultCurveOptions),
        curve: new BehaviorSubject<DilutionCurve | undefined>(undefined),
    };

    get options() {
        return this.state.options.value;
    }

    get curve() {
        return this.state.curve.value;
    }

    update(next: Partial<DilutionCurveOptions>) {
        this.state.options.next({ ...this.options, ...next });
    }

    async init() {
        const curve = await CurvesApi.get(this.id);
        if (curve) {
            this.state.curve.next(curve);
        }
        if (curve?.options) {
            this.state.options.next(curve.options);
        }
    }

    mount(): void {
        // TODO: do this with ModelAction
        
    }

    constructor(public id: string) {
        super();
    }
}

async function createModel(id: string) {
    const model = new EditCurveModel(id);
    await model.init();
    return model;
}

export function EditCurveUI() {
    const { id } = useParams();
    const { model, loading, error } = useAsyncModel(createModel, [id]);
    
    if (error) {
        return <div>Error: {String(error)}</div>;
    }
    
    if (!model || loading) {
        return <div>Loading...</div>;
    }

    return <EditCurve model={model} />
}

function EditCurve({ model }: { model: EditCurveModel }) {
    return (
        <>TODO: edit curve</>
    );
}