import { ReactiveModel } from "@/lib/reactive-model";
import { DefaultCurveOptions, DilutionCurve, DilutionCurveOptions } from "@/model/curve";
import { BehaviorSubject } from "rxjs";
import { CurvesApi } from "./api";
import { useNavigate, useParams } from "react-router";
import { useAsyncModel } from "@/lib/hooks/use-async-model";
import { AsyncWrapper } from "@/lib/components/async-wrapper";
import { Box, Button, VStack } from "@chakra-ui/react";
import { useBehavior } from "@/lib/hooks/use-behavior";
import { uuid4 } from "@/lib/uuid";

class CurvesModel extends ReactiveModel {
    state = {
        curves: new BehaviorSubject<DilutionCurve[]>([]),
    };

    async init() {
        const curves = await CurvesApi.list();
        this.state.curves.next(curves);
    }
}

async function createModel() {
    const model = new CurvesModel();
    await model.init();
    return model;
}

export function CurvesUI() {
    const { model, loading, error } = useAsyncModel(createModel, []);

    return (
        <AsyncWrapper loading={!model || loading} error={error}>
            <CurveList model={model!} />
        </AsyncWrapper>
    );
}

function CurveList({ model }: {model: CurvesModel}) {
    const curves = useBehavior(model.state.curves);
    const navigate = useNavigate();
    return (
        <VStack>
            <Box>
                <Button onClick={() => navigate(`/curves/${uuid4()}`)}>New Curve</Button>
            </Box>
            <Box>
                {curves.map(curve => <Button key={curve.id} onClick={() => navigate(`/curves/${curve.id}`)}>{curve.id}: {curve.name ?? 'unnamed'}</Button>)}
            </Box>
        </VStack>
    );
}