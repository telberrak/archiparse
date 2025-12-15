<?xml version="1.0" encoding="UTF-8"?>
<!--
    Template XSLT Principal - Transformation vers JSON
    Transforme un fichier IFCXML en JSON normalisé
    Note: Génère du JSON textuel pour compatibilité maximale
-->

<xsl:stylesheet version="2.0"
    xmlns:xsl="http://www.w3.org/1999/XSL/Transform"
    xmlns:ifc="http://www.buildingsmart-tech.org/ifcXML/IFC4/final"
    xmlns:ifc2x3="http://www.iai-tech.org/ifcXML/IFC2x3/FINAL"
    xmlns:xlink="http://www.w3.org/1999/xlink"
    xmlns:xs="http://www.w3.org/2001/XMLSchema"
    exclude-result-prefixes="ifc ifc2x3 xlink xs">

    <xsl:import href="../modules/common.xsl"/>
    <xsl:import href="../modules/entities.xsl"/>
    <xsl:import href="../modules/relationships.xsl"/>

    <!-- Sortie texte (JSON) -->
    <xsl:output method="text" encoding="UTF-8"/>

    <!-- Fonction pour échapper les chaînes JSON -->
    <xsl:function name="ifc:json-escape" as="xs:string">
        <xsl:param name="str" as="xs:string?"/>
        <xsl:choose>
            <xsl:when test="not($str)">""</xsl:when>
            <xsl:otherwise>
                <xsl:value-of select="replace(replace(replace(replace($str, '\\', '\\\\'), '&quot;', '\\&quot;'), '&#10;', '\\n'), '&#13;', '\\r')"/>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:function>

    <!-- Point d'entrée principal -->
    <xsl:template match="/">
        <xsl:variable name="all-elements" select="//*[@id]"/>
        <xsl:text>{</xsl:text>
        
        <!-- Projet -->
        <xsl:text>"project":</xsl:text>
        <xsl:apply-templates select="*[local-name()='ifcXML' or local-name()='uos']" mode="ifc:project">
            <xsl:with-param name="all-elements" select="$all-elements"/>
        </xsl:apply-templates>
        
        <!-- Éléments par GUID -->
        <xsl:text>,"elements":{"byGuid":{</xsl:text>
        <xsl:variable name="elements" select="$all-elements[
            local-name()='IfcWall' or
            local-name()='IfcSlab' or
            local-name()='IfcDoor' or
            local-name()='IfcWindow' or
            local-name()='IfcBeam' or
            local-name()='IfcColumn' or
            local-name()='IfcRoof' or
            local-name()='IfcStair' or
            starts-with(local-name(), 'IfcBuildingElement')
        ]"/>
        <xsl:for-each select="$elements">
            <xsl:variable name="guid" select="ifc:extract-guid(.)"/>
            <xsl:if test="$guid">
                <xsl:if test="position() > 1">,</xsl:if>
                <xsl:text>"</xsl:text><xsl:value-of select="$guid"/><xsl:text>":</xsl:text>
                <xsl:apply-templates select="." mode="ifc:element"/>
            </xsl:if>
        </xsl:for-each>
        <xsl:text>}}</xsl:text>
        
        <!-- Relations -->
        <xsl:text>,"relationships":</xsl:text>
        <xsl:call-template name="ifc:extract-relationships">
            <xsl:with-param name="all-elements" select="$all-elements"/>
        </xsl:call-template>
        
        <xsl:text>}</xsl:text>
    </xsl:template>

    <!-- Template pour la structure de projet -->
    <xsl:template match="*[local-name()='ifcXML' or local-name()='uos']" mode="ifc:project">
        <xsl:param name="all-elements" as="element()*"/>
        
        <xsl:variable name="project" select="$all-elements[local-name()='IfcProject'][1]"/>
        <xsl:choose>
            <xsl:when test="$project">
                <xsl:text>{</xsl:text>
                <xsl:apply-templates select="$project" mode="ifc:entity"/>
                <xsl:text>}</xsl:text>
            </xsl:when>
            <xsl:otherwise>
                <xsl:text>{}</xsl:text>
            </xsl:otherwise>
        </xsl:choose>
    </xsl:template>

    <!-- Template pour un élément de construction -->
    <xsl:template match="*" mode="ifc:element">
        <xsl:variable name="guid" select="ifc:extract-guid(.)"/>
        <xsl:variable name="name" select="ifc:extract-name(.)"/>
        <xsl:variable name="description" select="ifc:extract-description(.)"/>
        
        <xsl:text>{</xsl:text>
        <xsl:text>"guid":"</xsl:text><xsl:value-of select="$guid"/><xsl:text>"</xsl:text>
        <xsl:text>,"type":"</xsl:text><xsl:value-of select="local-name()"/><xsl:text>"</xsl:text>
        <xsl:if test="$name">
            <xsl:text>,"name":"</xsl:text><xsl:value-of select="ifc:json-escape($name)"/><xsl:text>"</xsl:text>
        </xsl:if>
        <xsl:if test="$description">
            <xsl:text>,"description":"</xsl:text><xsl:value-of select="ifc:json-escape($description)"/><xsl:text>"</xsl:text>
        </xsl:if>
        <xsl:text>}</xsl:text>
    </xsl:template>

</xsl:stylesheet>
