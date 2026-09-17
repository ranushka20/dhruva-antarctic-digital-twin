import { ChemicalLabEquipment, EarthSciencesLabEquipment, ElectricalLabEquipment, LifeSciencesLabEquipment } from "./LabEquipment";
import { CHPEquipment, TechnicalEquipment, WaterTreatmentEquipment } from "./TechnicalEquipment";
import StorageEquipment from "./StorageEquipment";
import WorkshopEquipment from "./WorkshopEquipment";

export default function Furniture({ room }) {
  switch (room.type) {
    case "electrical-lab":
      return <ElectricalLabEquipment room={room} />;
    case "life-sciences-lab":
      return <LifeSciencesLabEquipment room={room} />;
    case "chemical-lab":
      return <ChemicalLabEquipment room={room} />;
    case "earth-sciences-lab":
      return <EarthSciencesLabEquipment room={room} />;
    case "chp":
      return <CHPEquipment room={room} />;
    case "technical":
      return <TechnicalEquipment room={room} />;
    case "water-treatment":
      return <WaterTreatmentEquipment room={room} />;
    case "storage":
      return <StorageEquipment room={room} />;
    case "workshop":
      return <WorkshopEquipment room={room} />;
    case "garage":
      return <WorkshopEquipment room={room} garage />;
    default:
      return null;
  }
}
